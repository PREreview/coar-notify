import { HttpMiddleware, HttpRouter, HttpServerResponse } from '@effect/platform'
import { Context, Effect, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Prereview from './Prereview.js'
import type * as Slack from './Slack.js'

export const SlackShareChannelId = Context.GenericTag<Slack.SlackChannelId>('SlackShareChannelId')

export const PrereviewAuthToken = Context.GenericTag<string>('PrereviewAuthToken')

export class PublicUrl extends Context.Tag('PublicUrl')<PublicUrl, URL>() {}

export const Router = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/health',
    pipe(HttpServerResponse.json({ status: 'ok' }), Effect.andThen(HttpMiddleware.withLoggerDisabled)),
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
