import { HttpMiddleware, HttpRouter, HttpServerResponse } from '@effect/platform'
import { Context, Data, Effect, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Prereview from './Prereview.js'
import * as Redis from './Redis.js'
import type * as Slack from './Slack.js'

export const SlackShareChannelId = Context.GenericTag<Slack.SlackChannelId>('SlackShareChannelId')

export const PrereviewAuthToken = Context.GenericTag<string>('PrereviewAuthToken')

export class PublicUrl extends Context.Tag('PublicUrl')<PublicUrl, URL>() {}

class RedisTimeout extends Data.TaggedError('RedisTimeout') {
  readonly message = 'Connection timeout'
}

export const Router = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/health',
    Effect.gen(function* () {
      yield* pipe(Redis.ping(), Effect.timeoutFail({ duration: '900 millis', onTimeout: () => new RedisTimeout() }))

      return yield* pipe(HttpServerResponse.json({ status: 'ok' }), HttpMiddleware.withLoggerDisabled)
    }).pipe(
      Effect.catchTags({
        RedisError: error =>
          Effect.gen(function* () {
            yield* Effect.logError('Unable to ping Redis').pipe(Effect.annotateLogs({ message: error.message }))

            return yield* HttpServerResponse.json({ status: 'error' }, { status: StatusCodes.SERVICE_UNAVAILABLE })
          }),
        RedisTimeout: error =>
          Effect.gen(function* () {
            yield* Effect.logError('Unable to ping Redis').pipe(Effect.annotateLogs({ message: error.message }))

            return yield* HttpServerResponse.json({ status: 'error' }, { status: StatusCodes.SERVICE_UNAVAILABLE })
          }),
      }),
    ),
  ),
  HttpRouter.post(
    '/inbox',
    Effect.gen(function* () {
      const prereviewUrl = yield* Prereview.PrereviewUrl

      if (prereviewUrl.href === 'https://prereview.org/') {
        return yield* HttpServerResponse.empty({ headers: { 'fly-replay': 'app=prereview' } })
      }

      if (prereviewUrl.href === 'https://sandbox.prereview.org/') {
        return yield* HttpServerResponse.empty({ headers: { 'fly-replay': 'app=prereview-sandbox' } })
      }

      return yield* HttpServerResponse.empty({ status: StatusCodes.SERVICE_UNAVAILABLE })
    }),
  ),
  Effect.catchTag('RouteNotFound', () => HttpServerResponse.empty({ status: StatusCodes.NOT_FOUND })),
)
