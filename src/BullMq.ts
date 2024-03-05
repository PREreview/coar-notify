import * as BullMq from 'bullmq'
import { Context, Data, Effect, Layer, Random, type ReadonlyRecord, Runtime, type Schedule } from 'effect'
import type { JsonValue } from 'type-fest'
import * as Redis from './Redis.js'

export type Processor<R = never> = (data: JsonValue) => Effect.Effect<void, Error, R>

export interface Queue<N extends string, Q extends QueueJobs> {
  readonly name: N
  readonly add: <J extends Extract<keyof Q, string>>(jobName: J, payload: Q[J]) => Effect.Effect<string, BullMqError>
  readonly run: <R1 = never, R2 = never>(
    handler: Processor<R1>,
    schedule: Schedule.Schedule<unknown, void, R2>,
  ) => Effect.Effect<void, never, R1 | R2>
}

export type QueueJobs = ReadonlyRecord.ReadonlyRecord<string, JsonValue>

export interface QueueOptions<N extends string> {
  readonly name: N
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
      const queue = new BullMq.Queue(layerOptions.name, { connection: redis })

      yield* _(Effect.addFinalizer(() => Effect.promise(() => queue.close())))

      const add: Queue<N, Q>['add'] = (jobName, payload) =>
        Effect.gen(function* (_) {
          const job = yield* _(Effect.tryPromise({ try: () => queue.add(jobName, payload), catch: toBullMqError }))

          yield* _(Effect.logDebug('Job added to queue'), Effect.annotateLogs('jobId', job.id))

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
                  yield* _(Effect.logDebug('Job active'))

                  yield* _(handler(job.data))

                  yield* _(Effect.promise(() => job.moveToCompleted(undefined, token)))
                  yield* _(Effect.logDebug('Job completed'))
                }),
                Effect.catchAll(error =>
                  Effect.gen(function* (_) {
                    yield* _(Effect.promise(() => job.moveToFailed(error, token)))
                    yield* _(Effect.logDebug('Job failed'), Effect.annotateLogs('reason', job.failedReason))
                  }),
                ),
                Effect.annotateLogs({ job: job.id, jobName: job.name, attempt: job.attemptsStarted }),
              )
            }).pipe(Effect.repeat(schedule), Effect.annotateLogs('worker', worker.id)),
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
): Effect.Effect<string, BullMqError, Queue<N, { [K in J]: P }>> =>
  Effect.gen(function* (_) {
    const queue = yield* _(QueueTag(queueName))

    return yield* _(queue.add(jobName, payload))
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
