import { HttpServer } from '@effect/platform-node'
import { Schema, TreeFormatter } from '@effect/schema'
import { Context, Data, Effect } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as CoarNotify from './CoarNotify.js'
import * as Doi from './Doi.js'
import * as Nodemailer from './Nodemailer.js'
import * as Redis from './Redis.js'
import * as Slack from './Slack.js'
import * as Temporal from './Temporal.js'

export interface SlackChannelConfig {
  readonly id: string
}

export const SlackChannelConfig = Context.Tag<SlackChannelConfig>()

const NotificationSchema = Schema.struct({
  timestamp: Temporal.InstantInMillisecondsSchema,
  notification: CoarNotify.RequestReviewSchema,
})

class RedisTimeout extends Data.TaggedError('RedisTimeout') {
  readonly message = 'Connection timeout'
}

export const Router = HttpServer.router.empty.pipe(
  HttpServer.router.get(
    '/health',
    Effect.gen(function* (_) {
      yield* _(Redis.ping(), Effect.timeoutFail({ duration: '900 millis', onTimeout: () => new RedisTimeout() }))

      return yield* _(HttpServer.response.json({ status: 'ok' }), HttpServer.middleware.withLoggerDisabled)
    }).pipe(
      Effect.catchTags({
        RedisError: error =>
          Effect.gen(function* (_) {
            yield* _(Effect.logError('Unable to ping Redis').pipe(Effect.annotateLogs({ message: error.message })))

            return yield* _(HttpServer.response.json({ status: 'error' }, { status: StatusCodes.SERVICE_UNAVAILABLE }))
          }),
        RedisTimeout: error =>
          Effect.gen(function* (_) {
            yield* _(Effect.logError('Unable to ping Redis').pipe(Effect.annotateLogs({ message: error.message })))

            return yield* _(HttpServer.response.json({ status: 'error' }, { status: StatusCodes.SERVICE_UNAVAILABLE }))
          }),
      }),
    ),
  ),
  HttpServer.router.post(
    '/inbox',
    Effect.gen(function* (_) {
      const timestamp = yield* _(Temporal.Timestamp)
      const requestReview = yield* _(HttpServer.request.schemaBodyJson(CoarNotify.RequestReviewSchema))

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
                url: new URL(
                  `https://prereview.org/preprints/doi-${requestReview.object['ietf:cite-as']
                    .toLowerCase()
                    .replaceAll('-', '+')
                    .replaceAll('/', '-')}/write-a-prereview`,
                ),
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
            text: `
Hi ${requestReview.actor.name},

Thank you for requesting a review from PREreview.

While we cannot guarantee a review, we’ve let our community know.

If you have any questions, please let us know at help@prereview.org.

All the best,
PREreview
`.trim(),
          }),
        )
      }

      return yield* _(HttpServer.response.empty({ status: StatusCodes.CREATED }))
    }).pipe(
      Effect.catchTags({
        ParseError: error =>
          Effect.gen(function* (_) {
            yield* _(
              Effect.logInfo('Invalid request').pipe(
                Effect.annotateLogs({ message: TreeFormatter.formatError(error) }),
              ),
            )

            return HttpServer.response.empty({ status: StatusCodes.BAD_REQUEST })
          }),
        RedisError: error =>
          Effect.gen(function* (_) {
            yield* _(
              Effect.logError('Unable to write notification to Redis').pipe(
                Effect.annotateLogs({ message: error.message }),
              ),
            )

            return HttpServer.response.empty({ status: StatusCodes.SERVICE_UNAVAILABLE })
          }),
        RequestError: () => HttpServer.response.empty({ status: StatusCodes.BAD_REQUEST }),
        SlackErrorResponse: error =>
          Effect.gen(function* (_) {
            yield* _(
              Effect.logError('Unable post chat message on Slack').pipe(
                Effect.annotateLogs({ message: error.message }),
              ),
            )

            return HttpServer.response.empty({ status: StatusCodes.SERVICE_UNAVAILABLE })
          }),
        TransporterError: error =>
          Effect.gen(function* (_) {
            yield* _(
              Effect.logError('Unable to send email to author').pipe(Effect.annotateLogs({ message: error.message })),
            )

            return HttpServer.response.empty({ status: StatusCodes.SERVICE_UNAVAILABLE })
          }),
      }),
    ),
  ),
  Effect.catchTag('RouteNotFound', () => HttpServer.response.empty({ status: StatusCodes.NOT_FOUND })),
  HttpServer.server.serve(HttpServer.middleware.logger),
)
