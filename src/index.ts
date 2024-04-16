import { HttpClient, HttpServer } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Schema } from '@effect/schema'
import { Config, Effect, Layer, LogLevel, Logger, Schedule } from 'effect'
import { createServer } from 'node:http'
import * as BullMq from './BullMq.js'
import * as CoarNotify from './CoarNotify.js'
import { ConfigLive } from './Config.js'
import * as Crossref from './Crossref.js'
import { JsonLogger, LoggingHttpClient } from './Logger.js'
import * as Nodemailer from './Nodemailer.js'
import { OpenAi } from './OpenAi.js'
import * as Redis from './Redis.js'
import * as ReviewRequest from './ReviewRequest.js'
import { Router } from './Router.js'

const ServerLive = Router.pipe(
  HttpServer.server.serve(HttpServer.middleware.logger),
  Layer.provide(NodeHttpServer.server.layer(() => createServer(), { port: 3000 })),
)

const HttpClientLive = Layer.succeed(
  HttpClient.client.Client,
  LoggingHttpClient.pipe(
    HttpClient.client.mapRequest(
      HttpClient.request.setHeader(
        'User-Agent',
        'PREreview (https://prereview.org/; mailto:engineering@prereview.org)',
      ),
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
  Layer.provide(Layer.mergeAll(NotificationsQueueLive, Crossref.CrossrefApiLive)),
  Layer.provide(Layer.mergeAll(OpenAi.Live, HttpClientLive, RedisLive, Nodemailer.layer)),
  Layer.provide(ConfigLive),
  Layer.provide(Logger.replace(Logger.defaultLogger, JsonLogger)),
)

Layer.launch(Program).pipe(
  Effect.tapErrorCause(Effect.logError),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain,
)
