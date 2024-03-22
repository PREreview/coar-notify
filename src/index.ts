import { HttpClient } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Schema } from '@effect/schema'
import { Config, Effect, Layer, LogLevel, Logger, Schedule } from 'effect'
import { createServer } from 'node:http'
import * as BullMq from './BullMq.js'
import * as CoarNotify from './CoarNotify.js'
import { ConfigLive } from './Config.js'
import * as Crossref from './Crossref.js'
import { JsonLogger } from './Logger.js'
import * as Nodemailer from './Nodemailer.js'
import { OpenAi } from './OpenAi.js'
import * as Redis from './Redis.js'
import * as ReviewRequest from './ReviewRequest.js'
import { Router } from './Router.js'

const ServerLive = NodeHttpServer.server.layer(() => createServer(), { port: 3000 })

const HttpClientLive = Layer.succeed(
  HttpClient.client.Client,
  HttpClient.client.makeDefault(request =>
    Effect.Do.pipe(
      Effect.tap(() =>
        Effect.logDebug('Sending HTTP Request').pipe(
          Effect.annotateLogs({ headers: HttpClient.headers.redact(request.headers, 'authorization') }),
        ),
      ),
      Effect.zipRight(HttpClient.client.fetch()(request)),
      Effect.tap(response =>
        Effect.logDebug('Received HTTP response').pipe(
          Effect.annotateLogs({ status: response.status, headers: response.headers }),
        ),
      ),
      Effect.tapErrorTag('RequestError', error =>
        Effect.logError('Error sending HTTP request').pipe(
          Effect.annotateLogs({ reason: error.reason, error: error.error }),
        ),
      ),
      Effect.annotateLogs({
        url: request.url,
        urlParams: HttpClient.urlParams.toString(request.urlParams),
        method: request.method,
      }),
      Effect.withLogSpan('fetch'),
    ),
  ),
)

const RedisLive = Redis.layer

const QueueWorkerLive = Layer.effectDiscard(
  Config.withDefault(Config.integer('BULLMQ_WORKER_POLL'), 10).pipe(
    Effect.flatMap(schedule =>
      Effect.fork(
        BullMq.run(
          'coar-notify',
          data =>
            Effect.gen(function* (_) {
              const requestReview = yield* _(Schema.decodeUnknown(CoarNotify.RequestReviewSchema)(data))

              yield* _(ReviewRequest.handleReviewRequest(requestReview))
            }).pipe(
              Effect.catchTag('PreprintNotReady', () => Effect.fail(new BullMq.DelayedJob({ delay: '10 minutes' }))),
            ),
          Schedule.spaced(`${schedule} seconds`),
        ),
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

const HttpLive = Router.pipe(
  Layer.merge(QueueWorkerLive),
  Layer.provide(Layer.mergeAll(NotificationsQueueLive, Crossref.CrossrefApiLive)),
  Layer.provide(Layer.mergeAll(OpenAi.Live, HttpClientLive, ServerLive, RedisLive, Nodemailer.layer)),
  Layer.provide(ConfigLive),
  Layer.provide(Logger.replace(Logger.defaultLogger, JsonLogger)),
)

Layer.launch(HttpLive).pipe(
  Effect.tapErrorCause(Effect.logError),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain,
)
