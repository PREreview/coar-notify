import { HttpClient } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Schema } from '@effect/schema'
import { Effect, Layer, LogLevel, Logger, Schedule } from 'effect'
import { createServer } from 'node:http'
import * as BullMq from './BullMq.js'
import * as CoarNotify from './CoarNotify.js'
import { ConfigLive } from './Config.js'
import { JsonLogger } from './Logger.js'
import * as Nodemailer from './Nodemailer.js'
import * as Redis from './Redis.js'
import * as ReviewRequest from './ReviewRequest.js'
import { Router } from './Router.js'

const ServerLive = NodeHttpServer.server.layer(() => createServer(), { port: 3000 })

const RedisLive = Redis.layer

export const NotificationsQueueLive = BullMq.makeLayer<
  'coar-notify',
  { 'request-review': Schema.Schema.From<typeof CoarNotify.RequestReviewSchema> }
>({
  name: 'coar-notify',
  defaultJobOptions: { removeOnComplete: true, removeOnFail: false },
})

const HttpLive = Router.pipe(
  Layer.merge(
    Layer.effectDiscard(
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
          Schedule.spaced('10 seconds'),
        ),
      ),
    ),
  ),
  Layer.provide(NotificationsQueueLive),
  Layer.provide(Layer.mergeAll(HttpClient.client.layer, ServerLive, RedisLive, Nodemailer.layer)),
  Layer.provide(ConfigLive),
  Layer.provide(Logger.replace(Logger.defaultLogger, JsonLogger)),
)

Layer.launch(HttpLive).pipe(
  Effect.tapErrorCause(Effect.logError),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain,
)
