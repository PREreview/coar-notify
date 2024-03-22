import { Schema } from '@effect/schema'
import { Context, Data, Effect, Match, ReadonlyArray } from 'effect'
import { decode } from 'html-entities'
import mjml from 'mjml'
import slackifyMarkdown from 'slackify-markdown'
import striptags from 'striptags'
import * as CoarNotify from './CoarNotify.js'
import * as Doi from './Doi.js'
import * as Nodemailer from './Nodemailer.js'
import * as OpenAi from './OpenAi.js'
import * as Preprint from './Preprint.js'
import * as Prereview from './Prereview.js'
import * as Redis from './Redis.js'
import * as Slack from './Slack.js'
import * as Temporal from './Temporal.js'

export interface SlackChannelConfig {
  readonly id: Slack.SlackChannelId
}

export const SlackChannelConfig = Context.GenericTag<SlackChannelConfig>('SlackChannelConfig')

const NotificationSchema = Schema.struct({
  timestamp: Temporal.InstantInMillisecondsSchema,
  notification: CoarNotify.RequestReviewSchema,
})

export class PreprintNotReady extends Data.TaggedError('PreprintNotReady') {}

export const handleReviewRequest = (requestReview: CoarNotify.RequestReview) =>
  Effect.gen(function* (_) {
    const timestamp = yield* _(Temporal.Timestamp)
    const encoded = yield* _(
      Schema.encode(Schema.parseJson(NotificationSchema))({
        timestamp,
        notification: requestReview,
      }),
    )

    const preprintIsReady = yield* _(Prereview.preprintIsReady(requestReview.object['ietf:cite-as']))

    if (!preprintIsReady) {
      yield* _(Effect.fail(new PreprintNotReady()))
    }

    const preprint = yield* _(Preprint.getPreprint(requestReview.object['ietf:cite-as']))

    const intro = yield* _(
      OpenAi.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `
Write in friendly, simple, natural language.
Write in the active voice.
Write in US English (en-US).
You can include emojis.
Do not include hashtags.
Be positive, but ensure you don't discourage those who might feel marginalised or suffer from something like imposter syndrome from participating.
Don't use hyperbole.
Use objective vocabulary.
Don't repeat terms.
Use Markdown formatting.
Our name for a peer review is 'PREreview'.
        `,
          },
          {
            role: 'user',
            content: `
Someone has requested a review of a scientific preprint. The requester is not reviewing the preprint themselves; they might be an author.

Determine keywords, disciplines and topics from the abstract.

Use and emphasize these in a sentence of about 16 words, saying that the requester is looking for people to review the preprint.

Do not use keywords that appear in the title.

Do not use the word 'expertise' or 'explore'.
        `,
          },
          {
            role: 'user',
            content: `
Requester: """${requestReview.actor.name}"""

Title: """${preprint.title}"""

${ReadonlyArray.match(preprint.authors, {
  onEmpty: () => '',
  onNonEmpty: authors => `Authors: """${formatList(authors)}"""`,
})}

Abstract: """
${preprint.abstract}
"""
  `,
          },
          {
            role: 'user',
            content: `
Here are some examples:

🛟 Chris Wilkinson needs your help with reviews of this preprint all about **biochemistry**, **protein degradation**, and **oxindoles**.

📣 Help Chris Wilkinson by reviewing this preprint focused on **biochemistry**, **protein degradation**, and **oxindoles**.

🤝 Junyue Rose invites you to review this preprint about **prison conditions**, **institutional racism**, and the **industrial-prison complex**.

🐔 If you’re excited by **habituation**, **gene silencing**, **chicken welfare**, and **blood parameters**, help Maya Garcia by reviewing this preprint.

🐟 If **rivers**, **beavers**, and **fish habitats** interest you, help Li Na Chen by writing a PREreview of this preprint.

🔎 Grace Abara is looking for help with reviews of this preprint about **peer review**, **preprint services**, and **scholarly communication**.
          `,
          },
        ],
        temperature: 0.25,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    )

    yield* _(Redis.lpush('notifications', encoded))

    yield* _(
      Slack.chatPostMessage({
        channel: (yield* _(SlackChannelConfig)).id,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${slackifyMarkdown(intro).trim()}

*<${Doi.toUrl(preprint.doi).href}|${decode(striptags(preprint.title)).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}>*
${ReadonlyArray.match(preprint.authors, {
  onEmpty: () => '',
  onNonEmpty: authors => `by ${formatList(authors)}`,
})}`.trim(),
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Write a PREreview',
              },
              url: Prereview.writeAPrereviewUrl(preprint.doi),
            },
            fields: [
              {
                type: 'mrkdwn',
                text: `*Posted*\n${renderDate(preprint.posted)}`,
              },
              {
                type: 'mrkdwn',
                text: `*Server*\n${Match.value(preprint.server).pipe(
                  Match.when('biorxiv', () => 'bioRxiv'),
                  Match.when('scielo', () => 'SciELO Preprints'),
                  Match.exhaustive,
                )}`,
              },
            ],
          },
        ],
        unfurl_links: false,
        unfurl_media: false,
      }),
    )

    if (requestReview.actor.id.protocol === 'mailto:') {
      yield* _(
        Nodemailer.sendMail({
          from: { name: 'PREreview', address: 'help@prereview.org' },
          to: { name: requestReview.actor.name, address: requestReview.actor.id.pathname },
          subject: 'Review requested from the PREreview community',
          html: mjml(`
              <mjml>
                <mj-body>
                  <mj-section>
                    <mj-column>
                      <mj-text>Hi ${requestReview.actor.name},</mj-text>
                      <mj-text>Thank you for requesting a review from PREreview.</mj-text>
                      <mj-text>
                        While we cannot guarantee a review, we’ve shared your request with our PREreview community on
                        our #request-a-review Slack channel.
                      </mj-text>
                      <mj-text>
                        You can join our Slack Community and add further details to your review request by signing up
                        at <a href="https://bit.ly/PREreview-Slack">bit.ly/PREreview-Slack</a>.
                      </mj-text>
                      <mj-text>
                        If you have any questions, please let us know at
                        <a href="mailto:help@prereview.org">help@prereview.org</a>.
                      </mj-text>
                      <mj-text>All the best,<br />PREreview</mj-text>
                    </mj-column>
                  </mj-section>
                  <mj-section padding-bottom="0" border-top="1px solid lightgrey">
                    <mj-column width="25%" vertical-align="middle">
                      <mj-image
                        href="https://prereview.org"
                        src="https://res.cloudinary.com/prereview/image/upload/f_auto,q_auto,w_300/emails/logo_tbhi5b"
                        padding="0"
                      />
                    </mj-column>
                    <mj-column width="75%" vertical-align="middle">
                      <mj-text font-size="11px">PREreview is a platform, resource center, and convener.</mj-text>
                      <mj-text font-size="11px">
                        We provide ways for feedback to preprints to be done openly, rapidly, constructively, and by a
                        global community of peers.
                      </mj-text>
                      <mj-text font-size="11px">
                        Join us at <a href="https://prereview.org">prereview.org</a> and
                        <a href="https://bit.ly/PREreview-Slack">sign up to our vibrant Slack community</a>.
                      </mj-text>
                    </mj-column>
                  </mj-section>
                </mj-body>
              </mjml>
            `).html,
          text: `
Hi ${requestReview.actor.name},

Thank you for requesting a review from PREreview.

While we cannot guarantee a review, we’ve shared your request with our PREreview community on our #request-a-review Slack channel.

You can join our Slack Community and add further details to your review request by signing up at https://bit.ly/PREreview-Slack.

If you have any questions, please let us know at help@prereview.org.

All the best,
PREreview

---

PREreview is a platform, resource center, and convener.
We provide ways for feedback to preprints to be done openly, rapidly, constructively, and by a global community of peers.
Join us at https://prereview.org and sign up to our vibrant Slack community at https://bit.ly/PREreview-Slack.
`.trim(),
        }),
      )
    }
  }).pipe(
    Effect.tapErrorTag('GetPreprintError', error =>
      Effect.logInfo('Unable to get preprint data').pipe(Effect.annotateLogs({ message: error.message })),
    ),
    Effect.tapErrorTag('OpenAiError', error =>
      Effect.logInfo('Unable to get generated intro from OpenAI').pipe(Effect.annotateLogs({ message: error.message })),
    ),
    Effect.tapErrorTag('RedisError', error =>
      Effect.logInfo('Unable to write notification to Redis').pipe(Effect.annotateLogs({ message: error.message })),
    ),
    Effect.tapErrorTag('SlackError', error =>
      Effect.logInfo('Unable post chat message on Slack').pipe(Effect.annotateLogs({ message: error.message })),
    ),
    Effect.tapErrorTag('TransporterError', error =>
      Effect.logInfo('Unable to send email to author').pipe(Effect.annotateLogs({ message: error.message })),
    ),
    Effect.scoped,
  )

function formatList(list: ReadonlyArray<string>) {
  const formatter = new Intl.ListFormat('en')

  return formatter.format(list)
}

function renderDate(date: Temporal.PlainDate) {
  return date.toLocaleString('en', { dateStyle: 'long' })
}
