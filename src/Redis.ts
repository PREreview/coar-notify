import { Context, Data, Effect, Layer, Runtime } from 'effect'
import IoRedis from 'ioredis'

export type Redis = IoRedis.Redis

export interface RedisConfig {
  readonly family: number
  readonly url: URL
}

export const Redis = Context.GenericTag<Redis>('IoRedis/Redis')

export const RedisConfig = Context.GenericTag<RedisConfig>('RedisConfig')

export class RedisError extends Data.TaggedError('RedisError')<{
  readonly cause?: Error
  readonly message: string
}> {}

export const layer: Layer.Layer<Redis, never, RedisConfig> = Layer.scoped(
  Redis,
  Effect.acquireRelease(
    Effect.gen(function* (_) {
      const config = yield* _(RedisConfig)
      const runtime = yield* _(Effect.runtime())

      const redis = new IoRedis.Redis(config.url.href, { family: config.family })

      redis.on('connect', () => Runtime.runSync(runtime)(Effect.logDebug('Redis connected')))
      redis.on('close', () => Runtime.runSync(runtime)(Effect.logDebug('Redis connection closed')))
      redis.on('reconnecting', () => Runtime.runSync(runtime)(Effect.logInfo('Redis reconnecting')))
      redis.removeAllListeners('error')
      redis.on('error', (error: Error) =>
        Runtime.runSync(runtime)(
          Effect.logError('Redis connection error').pipe(Effect.annotateLogs({ error: error.message })),
        ),
      )

      return redis
    }),
    redis => Effect.sync(() => redis.disconnect()),
  ),
)

export const ping = (): Effect.Effect<'PONG', RedisError, Redis> =>
  Effect.gen(function* (_) {
    const redis = yield* _(Redis)

    if (redis.status !== 'ready') {
      yield* _(Effect.fail(new RedisError({ message: `Redis not ready (${redis.status})` })))
    }

    return yield* _(Effect.tryPromise({ try: () => redis.ping(), catch: toRedisError }))
  })

export const lpush = (
  ...args: [key: IoRedis.RedisKey, ...elements: ReadonlyArray<IoRedis.RedisValue>]
): Effect.Effect<void, RedisError, Redis> =>
  Effect.gen(function* (_) {
    const redis = yield* _(Redis)

    yield* _(Effect.tryPromise({ try: () => redis.lpush(...args), catch: toRedisError }))
  })

const toRedisError = (error: unknown): RedisError =>
  new RedisError(error instanceof Error ? { cause: error, message: error.message } : { message: String(error) })
