import { HttpClient } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Effect, Layer, LogLevel, Logger } from 'effect'
import { createServer } from 'node:http'
import { ConfigLive } from './Config.js'
import { JsonLogger } from './Logger.js'
import * as Nodemailer from './Nodemailer.js'
import * as Redis from './Redis.js'
import { Router } from './Router.js'

const ServerLive = NodeHttpServer.server.layer(() => createServer(), { port: 3000 })

const RedisLive = Redis.layer

const HttpLive = Router.pipe(
  Layer.provide(Layer.mergeAll(HttpClient.client.layer, ServerLive, RedisLive, Nodemailer.layer)),
  Layer.provide(ConfigLive),
  Layer.provide(Logger.replace(Logger.defaultLogger, JsonLogger)),
)

Layer.launch(HttpLive).pipe(
  Effect.tapErrorCause(Effect.logError),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain,
)
