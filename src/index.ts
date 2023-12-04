import { HttpServer, Runtime } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { createServer } from 'node:http'
import * as CoarNotify from './CoarNotify.js'

const serve = HttpServer.router.empty.pipe(
  HttpServer.router.get('/health', HttpServer.response.json({ status: 'ok' })),
  HttpServer.router.post(
    '/inbox',
    Effect.gen(function* (_) {
      yield* _(HttpServer.request.schemaBodyJson(CoarNotify.ReviewActionSchema))

      return yield* _(HttpServer.response.empty({ status: 503 }))
    }).pipe(
      Effect.catchTags({
        ParseError: () => HttpServer.response.empty({ status: 400 }),
        RequestError: () => HttpServer.response.empty({ status: 400 }),
      }),
    ),
  ),
  Effect.catchTag('RouteNotFound', () => HttpServer.response.empty({ status: 404 })),
  HttpServer.server.serve(HttpServer.middleware.logger),
)

const ServerLive = HttpServer.server.layer(() => createServer(), { port: 3000 })

const HttpLive = Layer.scopedDiscard(serve).pipe(Layer.provide(ServerLive))

Layer.launch(HttpLive).pipe(Effect.tapErrorCause(Effect.logError), Runtime.runMain)
