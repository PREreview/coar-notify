import { Headers, HttpMiddleware, HttpServer, HttpServerRequest } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Layer, LogLevel, Logger, Option, Request } from 'effect'
import { createServer } from 'node:http'
import { ConfigLive } from './Config.js'
import * as Redis from './Redis.js'
import { PublicUrl, Router } from './Router.js'

const logRequest = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const publicUrl = yield* PublicUrl

    const url = new URL(`${publicUrl.origin}${request.url}`)

    if (url.pathname === '/health') {
      return yield* app
    }

    yield* Effect.annotateLogs(Effect.logInfo('Received HTTP request'), {
      'http.method': request.method,
      'http.url': request.url,
      'http.path': url.pathname,
      'http.query': Object.fromEntries(url.searchParams),
      'http.referrer': Option.getOrUndefined(Headers.get(request.headers, 'Referer')),
      'http.userAgent': Option.getOrUndefined(Headers.get(request.headers, 'User-Agent')),
    })

    return yield* app
  }),
)

const ServerLive = Router.pipe(
  logRequest,
  HttpServer.serve(HttpMiddleware.logger),
  Layer.provide(
    NodeHttpServer.layerConfig(() => createServer(), { port: Config.withDefault(Config.integer('PORT'), 3000) }),
  ),
)

const RedisLive = Redis.layer

const Program = ServerLive.pipe(
  Layer.provide(RedisLive),
  Layer.provide(ConfigLive),
  Layer.provide(Logger.json),
  Layer.provide(Layer.setRequestCache(Request.makeCache({ capacity: 5_000, timeToLive: '1 week' }))),
)

Layer.launch(Program).pipe(
  Effect.tapErrorCause(Effect.logError),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain({ disablePrettyLogger: true }),
)
