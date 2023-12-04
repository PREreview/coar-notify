import { Context, Data, Effect, Layer } from 'effect'
import IoRedis from 'ioredis'

export type Redis = IoRedis.Redis

export const Redis = Context.Tag<Redis>('IoRedis/Redis')

export class RedisError extends Data.TaggedError('RedisError')<{
  readonly error: unknown
}> {}

export const layer: Layer.Layer<never, never, Redis> = Layer.scoped(
  Redis,
  Effect.acquireRelease(Effect.succeed(new IoRedis.Redis()), redis => Effect.sync(() => redis.disconnect())),
)

export const ping = (): Effect.Effect<Redis, RedisError, 'PONG'> =>
  Effect.gen(function* (_) {
    const redis = yield* _(Redis)

    if (redis.status !== 'ready') {
      yield* _(Effect.fail(new RedisError({ error: `Redis not ready (${redis.status}` })))
    }

    return yield* _(Effect.tryPromise({ try: () => redis.ping(), catch: error => new RedisError({ error }) }))
  })

export const lpush = (
  ...args: [key: IoRedis.RedisKey, ...elements: ReadonlyArray<IoRedis.RedisValue>]
): Effect.Effect<Redis, RedisError, void> =>
  Effect.gen(function* (_) {
    const redis = yield* _(Redis)

    yield* _(Effect.tryPromise({ try: () => redis.lpush(...args), catch: error => new RedisError({ error }) }))
  })
