import { HttpServer } from '@effect/platform-node'
import { Schema, TreeFormatter } from '@effect/schema'
import { Effect } from 'effect'
import * as CoarNotify from './CoarNotify.js'
import * as Doi from './Doi.js'
import * as Redis from './Redis.js'
import * as Slack from './Slack.js'
import * as Temporal from './Temporal.js'

const NotificationSchema = Schema.struct({
  timestamp: Temporal.InstantInMillisecondsSchema,
  notification: CoarNotify.ReviewActionSchema,
})

export const Router = HttpServer.router.empty.pipe(
  HttpServer.router.get(
    '/health',
    Effect.gen(function* (_) {
      yield* _(Redis.ping())

      return yield* _(HttpServer.response.json({ status: 'ok' }), HttpServer.middleware.withLoggerDisabled)
    }).pipe(
      Effect.catchTags({
        RedisError: error =>
          Effect.gen(function* (_) {
            yield* _(Effect.logError('Unable to ping Redis').pipe(Effect.annotateLogs({ message: error.message })))

            return yield* _(HttpServer.response.json({ status: 'error' }, { status: 503 }))
          }),
      }),
    ),
  ),
  HttpServer.router.post(
    '/inbox',
    Effect.gen(function* (_) {
      const timestamp = yield* _(Temporal.Timestamp)
      const reviewAction = yield* _(HttpServer.request.schemaBodyJson(CoarNotify.ReviewActionSchema))

      const encoded = yield* _(
        Schema.encode(Schema.ParseJson.pipe(Schema.compose(NotificationSchema)))({
          timestamp,
          notification: reviewAction,
        }),
      )

      yield* _(Redis.lpush('notifications', encoded))

      yield* _(
        Slack.chatPostMessage({
          channel: 'C05B95LEN5C',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `A new request from ${reviewAction.actor.name} has come in for a review of <${
                  Doi.toUrl(reviewAction.object['ietf:cite-as']).href
                }|${reviewAction.object['ietf:cite-as']}>`,
              },
              accessory: {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Write a PREreview',
                },
                url: new URL(
                  `https://prereview.org/preprints/doi-${reviewAction.object['ietf:cite-as']
                    .toLowerCase()
                    .replaceAll('-', '+')
                    .replaceAll('/', '-')}/write-a-prereview`,
                ),
              },
            },
          ],
        }),
      )

      return yield* _(HttpServer.response.empty({ status: 201 }))
    }).pipe(
      Effect.catchTags({
        ParseError: error =>
          Effect.gen(function* (_) {
            yield* _(
              Effect.logInfo('Invalid request').pipe(
                Effect.annotateLogs({ message: TreeFormatter.formatErrors(error.errors) }),
              ),
            )

            return HttpServer.response.empty({ status: 400 })
          }),
        RedisError: error =>
          Effect.gen(function* (_) {
            yield* _(
              Effect.logError('Unable to write notification to Redis').pipe(
                Effect.annotateLogs({ message: error.message }),
              ),
            )

            return HttpServer.response.empty({ status: 503 })
          }),
        RequestError: () => HttpServer.response.empty({ status: 400 }),
        SlackErrorResponse: error =>
          Effect.gen(function* (_) {
            yield* _(
              Effect.logError('Unable post chat message on Slack').pipe(
                Effect.annotateLogs({ message: error.message }),
              ),
            )

            return HttpServer.response.empty({ status: 503 })
          }),
      }),
    ),
  ),
  Effect.catchTag('RouteNotFound', () => HttpServer.response.empty({ status: 404 })),
  HttpServer.server.serve(HttpServer.middleware.logger),
)
