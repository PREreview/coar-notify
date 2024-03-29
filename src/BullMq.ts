import * as BullMq from 'bullmq'
import { Clock, Context, Data, Duration, Effect, Layer, Random, type ReadonlyRecord, Runtime, Schedule } from 'effect'
import type { JsonValue } from 'type-fest'
import * as Redis from './Redis.js'

export type Processor<R = never> = (data: JsonValue) => Effect.Effect<void, Error | DelayedJob, R>

export class DelayedJob extends Data.TaggedClass('DelayedJob')<{ delay: Duration.DurationInput }> {}

export interface JobOptions {
  readonly jobId?: string
}

export interface Queue<N extends string, Q extends QueueJobs> {
  readonly name: N
  readonly add: <J extends Extract<keyof Q, string>>(
    jobName: J,
    payload: Q[J],
    options?: JobOptions,
  ) => Effect.Effect<string, BullMqError>
  readonly run: <R1 = never, R2 = never>(
    handler: Processor<R1>,
    schedule: Schedule.Schedule<unknown, void, R2>,
  ) => Effect.Effect<void, never, R1 | R2>
}

export type QueueJobs = ReadonlyRecord.ReadonlyRecord<string, JsonValue>

export interface QueueOptions<N extends string> {
  readonly name: N
  readonly defaultJobOptions?: {
    readonly delay?: Duration.DurationInput
    readonly removeOnComplete?: boolean
    readonly removeOnFail?: boolean
  }
}

export const QueueTag = <N extends string, Q extends QueueJobs>(name: N) =>
  Context.GenericTag<Queue<N, Q>>(`bullmq/${name}`)

export class BullMqError extends Data.TaggedError('BullMqError')<{
  readonly cause?: Error
  readonly message: string
}> {}

export function makeLayer<N extends string, Q extends QueueJobs>(
  layerOptions: QueueOptions<N>,
): Layer.Layer<Queue<N, Q>, never, Redis.Redis> {
  return Layer.scoped(
    QueueTag<(typeof layerOptions)['name'], Q>(layerOptions.name),
    Effect.gen(function* (_) {
      const redis = yield* _(Redis.Redis)
      const queue = new BullMq.Queue(layerOptions.name, {
        connection: redis,
        defaultJobOptions: layerOptions.defaultJobOptions
          ? {
              ...layerOptions.defaultJobOptions,
              delay:
                typeof layerOptions.defaultJobOptions.delay === 'undefined'
                  ? 0
                  : Duration.toMillis(layerOptions.defaultJobOptions.delay),
            }
          : {},
      })
      const lockDuration = '30 seconds' satisfies Duration.DurationInput

      yield* _(Effect.addFinalizer(() => Effect.promise(() => queue.close())))

      const add: Queue<N, Q>['add'] = (jobName, payload, options) =>
        Effect.gen(function* (_) {
          const job = yield* _(
            Effect.tryPromise({ try: () => queue.add(jobName, payload, options), catch: toBullMqError }),
          )

          yield* _(
            Effect.logDebug('Job added to queue'),
            Effect.annotateLogs({
              jobId: job.id,
              delay: job.delay > 0 ? Duration.format(Duration.millis(job.delay)) : undefined,
            }),
          )

          return job.asJSON().id
        }).pipe(Effect.annotateLogs({ queue: layerOptions.name, jobName: jobName }))

      const run: Queue<N, Q>['run'] = (handler, schedule) =>
        Effect.acquireUseRelease(
          Effect.gen(function* (_) {
            const runtime = yield* _(Effect.runtime())
            const connection = yield* _(
              Redis.duplicate(redis, {
                maxRetriesPerRequest: null,
                lazyConnect: true,
              }),
            )

            const worker = new BullMq.Worker<JsonValue, unknown>(layerOptions.name, undefined, {
              autorun: false,
              connection,
              lockDuration: Duration.toMillis(lockDuration),
            })

            worker.on('ready', () =>
              Runtime.runSync(runtime)(Effect.logDebug('Worker ready').pipe(Effect.annotateLogs('worker', worker.id))),
            )
            worker.on('closing', () =>
              Runtime.runSync(runtime)(
                Effect.logDebug('Worker closing').pipe(Effect.annotateLogs('worker', worker.id)),
              ),
            )
            worker.on('closed', () =>
              Runtime.runSync(runtime)(Effect.logDebug('Worker closed').pipe(Effect.annotateLogs('worker', worker.id))),
            )

            return worker
          }),
          worker =>
            Effect.gen(function* (_) {
              const token = (yield* _(Random.nextInt)).toString()
              const job = yield* _(
                Effect.promise(() => worker.getNextJob(token)),
                Effect.orElseSucceed(() => undefined),
              )

              if (!job) {
                return
              }

              yield* _(
                Effect.gen(function* (_) {
                  yield* _(
                    Effect.promise(() => job.extendLock(token, Duration.toMillis(lockDuration))),
                    Effect.tap(() => Effect.logInfo('Job lock extended')),
                    Effect.annotateLogs('duration', Duration.format(lockDuration)),
                    Effect.repeat(Schedule.fixed(Duration.toMillis(lockDuration) / 2)),
                    Effect.delay(Duration.toMillis(lockDuration) / 2),
                    Effect.fork,
                  )

                  yield* _(Effect.logDebug('Job active'))

                  yield* _(handler(job.data))

                  yield* _(Effect.promise(() => job.moveToCompleted(undefined, token)))
                  yield* _(Effect.logDebug('Job completed'))
                }),
                Effect.catchTag('DelayedJob', ({ delay }) =>
                  Effect.gen(function* (_) {
                    const timestamp = yield* _(Clock.currentTimeMillis)
                    yield* _(Effect.promise(() => job.moveToDelayed(timestamp + Duration.toMillis(delay), token)))
                    yield* _(Effect.logDebug('Job delayed'), Effect.annotateLogs('delay', Duration.format(delay)))
                  }),
                ),
                Effect.catchAll(error =>
                  Effect.gen(function* (_) {
                    yield* _(Effect.promise(() => job.moveToFailed(error, token)))
                    yield* _(Effect.logDebug('Job failed'), Effect.annotateLogs('reason', job.failedReason))
                  }),
                ),
                Effect.annotateLogs({ job: job.id, jobName: job.name, attempt: job.attemptsStarted }),
              )
            }).pipe(Effect.fork, Effect.repeat(schedule), Effect.annotateLogs('worker', worker.id)),
          worker => Effect.promise(() => worker.close()),
        ).pipe(Effect.annotateLogs('queue', layerOptions.name), Effect.scoped)

      return { name: layerOptions.name, add, run }
    }),
  )
}

export const add = <N extends string, J extends string, P extends JsonValue>(
  queueName: N,
  jobName: J,
  payload: P,
  options?: JobOptions,
): Effect.Effect<string, BullMqError, Queue<N, { [K in J]: P }>> =>
  Effect.gen(function* (_) {
    const queue = yield* _(QueueTag(queueName))

    return yield* _(queue.add(jobName, payload, options))
  })

export const run = <N extends string, R1, R2>(
  queueName: N,
  handler: Processor<R1>,
  schedule: Schedule.Schedule<unknown, void, R2>,
): Effect.Effect<void, never, Queue<N, ReadonlyRecord.ReadonlyRecord<never, never>> | R1 | R2> =>
  Effect.gen(function* (_) {
    const queue = yield* _(QueueTag(queueName))

    return yield* _(queue.run(handler, schedule))
  })

const toBullMqError = (error: unknown): BullMqError =>
  new BullMqError(error instanceof Error ? { cause: error, message: error.message } : { message: String(error) })
