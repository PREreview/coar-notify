import { HttpClient } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import type { Schema } from '@effect/schema'
import { Effect, Layer, LogLevel, Logger, Schedule } from 'effect'
import { createServer } from 'node:http'
import * as BullMq from './BullMq.js'
import type * as CoarNotify from './CoarNotify.js'
import { ConfigLive } from './Config.js'
import { JsonLogger } from './Logger.js'
import * as Nodemailer from './Nodemailer.js'
import * as Redis from './Redis.js'
import { Router } from './Router.js'

const ServerLive = NodeHttpServer.server.layer(() => createServer(), { port: 3000 })

const RedisLive = Redis.layer

export const NotificationsQueueLive = BullMq.makeLayer<
  'coar-notify',
  { 'request-review': Schema.Schema.From<typeof CoarNotify.RequestReviewSchema> }
>({
  name: 'coar-notify',
})

const HttpLive = Router.pipe(
  Layer.merge(
    Layer.effectDiscard(
      Effect.fork(
        BullMq.run(
          'coar-notify',
          data => Effect.logDebug('Found a notification').pipe(Effect.annotateLogs('data', data)),
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
