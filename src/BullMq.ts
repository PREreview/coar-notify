import * as BullMq from 'bullmq'
import { Context, Data, Effect, Layer, type ReadonlyRecord } from 'effect'
import * as Redis from './Redis.js'

export interface Queue<N extends string, Q extends QueueJobs> {
  readonly name: N
  readonly add: <J extends Extract<keyof Q, string>>(jobName: J, payload: Q[J]) => Effect.Effect<string, BullMqError>
}

export type QueueJobs = ReadonlyRecord.ReadonlyRecord<string, unknown>

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

      return { name: layerOptions.name, add }
    }),
  )
}

export const add = <N extends string, J extends string, P>(
  queueName: N,
  jobName: J,
  payload: P,
): Effect.Effect<string, BullMqError, Queue<N, { [K in J]: P }>> =>
  Effect.gen(function* (_) {
    const queue = yield* _(QueueTag(queueName))

    return yield* _(queue.add(jobName, payload))
  })

const toBullMqError = (error: unknown): BullMqError =>
  new BullMqError(error instanceof Error ? { cause: error, message: error.message } : { message: String(error) })
