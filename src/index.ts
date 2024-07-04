import { HttpClient, HttpClientRequest, HttpMiddleware, HttpServer } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Schema } from '@effect/schema'
import { Config, Effect, Layer, LogLevel, Logger, Request, Schedule } from 'effect'
import { createServer } from 'node:http'
import * as BullMq from './BullMq.js'
import * as CoarNotify from './CoarNotify.js'
import { ConfigLive } from './Config.js'
import * as Crossref from './Crossref.js'
import * as Datacite from './Datacite.js'
import { LoggingHttpClient } from './Logger.js'
import * as Nodemailer from './Nodemailer.js'
import { OpenAi } from './OpenAi.js'
import * as OpenAlex from './OpenAlex/index.js'
import * as Redis from './Redis.js'
import * as ReviewRequest from './ReviewRequest.js'
import { Router } from './Router.js'

const ServerLive = Router.pipe(
  HttpServer.serve(HttpMiddleware.logger),
  Layer.provide(
    NodeHttpServer.layerConfig(() => createServer(), { port: Config.withDefault(Config.integer('PORT'), 3000) }),
  ),
)

const HttpClientLive = Layer.succeed(
  HttpClient.HttpClient,
  LoggingHttpClient.pipe(
    HttpClient.mapRequest(
      HttpClientRequest.setHeader('User-Agent', 'PREreview (https://prereview.org/; mailto:engineering@prereview.org)'),
    ),
  ),
)

const RedisLive = Redis.layer

const QueueWorkerLive = Layer.effectDiscard(
  Config.withDefault(Config.duration('BULLMQ_WORKER_POLL'), '10 seconds').pipe(
    Effect.flatMap(schedule =>
      BullMq.run(
        'coar-notify',
        data =>
          Effect.gen(function* (_) {
            const requestReview = yield* _(Schema.decodeUnknown(CoarNotify.RequestReviewSchema)(data))

            yield* _(ReviewRequest.handleReviewRequest(requestReview))
          }).pipe(
            Effect.catchTag('PreprintNotReady', () => Effect.fail(new BullMq.DelayedJob({ delay: '10 minutes' }))),
          ),
        Schedule.spaced(schedule),
      ),
    ),
  ),
)

export const NotificationsQueueLive = BullMq.makeLayer<
  'coar-notify',
  { 'request-review': Schema.Schema.Encoded<typeof CoarNotify.RequestReviewSchema> }
>({
  name: 'coar-notify',
  defaultJobOptions: { delay: '10 seconds', removeOnComplete: true, removeOnFail: false },
})

const Program = Layer.mergeAll(ServerLive, QueueWorkerLive).pipe(
  Layer.provide(
    Layer.mergeAll(
      NotificationsQueueLive,
      Crossref.CrossrefApiLive,
      Datacite.DataciteApiLive,
      OpenAlex.OpenAlexApiLive,
    ),
  ),
  Layer.provide(Layer.mergeAll(OpenAi.Live, HttpClientLive, RedisLive, Nodemailer.layer)),
  Layer.provide(ConfigLive),
  Layer.provide(Logger.json),
  Layer.provide(Layer.setRequestCache(Request.makeCache({ capacity: 1_000, timeToLive: '60 minutes' }))),
)

Layer.launch(Program).pipe(
  Effect.tapErrorCause(Effect.logError),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain,
)
