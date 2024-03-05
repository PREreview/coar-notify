import { Schema } from '@effect/schema'
import { Context, Effect } from 'effect'
import mjml from 'mjml'
import * as CoarNotify from './CoarNotify.js'
import * as Doi from './Doi.js'
import * as Nodemailer from './Nodemailer.js'
import * as Prereview from './Prereview.js'
import * as Redis from './Redis.js'
import * as Slack from './Slack.js'
import * as Temporal from './Temporal.js'

export interface SlackChannelConfig {
  readonly id: string
}

export const SlackChannelConfig = Context.GenericTag<SlackChannelConfig>('SlackChannelConfig')

const NotificationSchema = Schema.struct({
  timestamp: Temporal.InstantInMillisecondsSchema,
  notification: CoarNotify.RequestReviewSchema,
})

export const handleReviewRequest = (requestReview: CoarNotify.RequestReview) =>
  Effect.gen(function* (_) {
    const timestamp = yield* _(Temporal.Timestamp)
    const encoded = yield* _(
      Schema.encode(Schema.parseJson(NotificationSchema))({
        timestamp,
        notification: requestReview,
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
              text: `A new request from ${requestReview.actor.name} has come in for a review of <${
                Doi.toUrl(requestReview.object['ietf:cite-as']).href
              }|${requestReview.object['ietf:cite-as']}>`,
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Write a PREreview',
              },
              url: Prereview.writeAPrereviewUrl(requestReview.object['ietf:cite-as']),
            },
          },
        ],
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
