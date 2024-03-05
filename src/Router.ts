import { HttpServer } from '@effect/platform'
import { Schema, TreeFormatter } from '@effect/schema'
import { Data, Effect } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as BullMq from './BullMq.js'
import * as CoarNotify from './CoarNotify.js'
import * as Redis from './Redis.js'
import * as ReviewRequest from './ReviewRequest.js'

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
      const requestReview = yield* _(HttpServer.request.schemaBodyJson(CoarNotify.RequestReviewSchema))
      const raw = yield* _(Schema.encode(CoarNotify.RequestReviewSchema)(requestReview))

      yield* _(ReviewRequest.handleReviewRequest(requestReview))

      yield* _(BullMq.add('coar-notify', 'request-review', raw))

      return yield* _(HttpServer.response.empty({ status: StatusCodes.CREATED }))
    }).pipe(
      Effect.catchTags({
        BullMqError: error =>
          Effect.gen(function* (_) {
            yield* _(
              Effect.logError('Unable to write job to BullMQ').pipe(Effect.annotateLogs({ message: error.message })),
            )

            return HttpServer.response.empty({ status: StatusCodes.SERVICE_UNAVAILABLE })
          }),
        ParseError: error =>
          Effect.gen(function* (_) {
            yield* _(
              Effect.logInfo('Invalid request').pipe(
                Effect.annotateLogs({ message: TreeFormatter.formatError(error) }),
              ),
            )

            return HttpServer.response.empty({ status: StatusCodes.BAD_REQUEST })
          }),
        RedisError: () => Effect.succeed(HttpServer.response.empty({ status: StatusCodes.SERVICE_UNAVAILABLE })),
        RequestError: () => HttpServer.response.empty({ status: StatusCodes.BAD_REQUEST }),
        SlackError: () => Effect.succeed(HttpServer.response.empty({ status: StatusCodes.SERVICE_UNAVAILABLE })),
        TransporterError: () => Effect.succeed(HttpServer.response.empty({ status: StatusCodes.SERVICE_UNAVAILABLE })),
      }),
    ),
  ),
  Effect.catchTag('RouteNotFound', () => HttpServer.response.empty({ status: StatusCodes.NOT_FOUND })),
  HttpServer.server.serve(HttpServer.middleware.logger),
)
