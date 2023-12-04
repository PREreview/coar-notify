import { HttpServer, Runtime } from '@effect/platform-node'
import { Schema } from '@effect/schema'
import { Effect, Layer } from 'effect'
import IoRedis from 'ioredis'
import { createServer } from 'node:http'
import * as CoarNotify from './CoarNotify.js'
import * as Redis from './Redis.js'
import * as Temporal from './Temporal.js'

const NotificationSchema = Schema.struct({
  timestamp: Temporal.InstantFromMillisecondsSchema(Schema.number),
  notification: CoarNotify.ReviewActionSchema,
})

const serve = HttpServer.router.empty.pipe(
  HttpServer.router.get('/health', HttpServer.response.json({ status: 'ok' })),
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

      return yield* _(HttpServer.response.empty({ status: 201 }))
    }).pipe(
      Effect.catchTags({
        ParseError: () => HttpServer.response.empty({ status: 400 }),
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
      }),
    ),
  ),
  Effect.catchTag('RouteNotFound', () => HttpServer.response.empty({ status: 404 })),
  HttpServer.server.serve(HttpServer.middleware.logger),
)

const ServerLive = HttpServer.server.layer(() => createServer(), { port: 3000 })

const RedisLive = Layer.effect(
  Redis.Redis,
  Effect.acquireRelease(Effect.succeed(new IoRedis.Redis()), redis => Effect.sync(() => redis.disconnect())),
)

const HttpLive = Layer.scopedDiscard(serve).pipe(Layer.provide(Layer.mergeAll(ServerLive, RedisLive)))

Layer.launch(HttpLive).pipe(Effect.tapErrorCause(Effect.logError), Effect.scoped, Runtime.runMain)
