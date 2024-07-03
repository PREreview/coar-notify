import { HttpServer } from '@effect/platform'
import { Schema, TreeFormatter } from '@effect/schema'
import { Array, Data, Effect, Exit, Option } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { createHash } from 'node:crypto'
import * as BullMq from './BullMq.js'
import * as CoarNotify from './CoarNotify.js'
import * as Doi from './Doi.js'
import * as LanguageCode from './LanguageCode.js'
import * as OpenAlex from './OpenAlex/index.js'
import * as Redis from './Redis.js'
import { getNotifications } from './ReviewRequest.js'
import * as Temporal from './Temporal.js'

class RedisTimeout extends Data.TaggedError('RedisTimeout') {
  readonly message = 'Connection timeout'
}

export const Router = HttpServer.router.empty.pipe(
  HttpServer.router.get(
    '/health',
    Effect.gen(function* (_) {
      yield* _(Redis.ping(), Effect.timeoutFail({ duration: '900 millis', onTimeout: () => new RedisTimeout() }))

      return yield* _(HttpServer.response.json({ status: 'ok' }), HttpServer.middleware.withLoggerDisabled)
    }).pipe(
      Effect.catchTags({
        RedisError: error =>
          Effect.gen(function* (_) {
            yield* _(Effect.logError('Unable to ping Redis').pipe(Effect.annotateLogs({ message: error.message })))

            return yield* _(HttpServer.response.json({ status: 'error' }, { status: StatusCodes.SERVICE_UNAVAILABLE }))
          }),
        RedisTimeout: error =>
          Effect.gen(function* (_) {
            yield* _(Effect.logError('Unable to ping Redis').pipe(Effect.annotateLogs({ message: error.message })))

            return yield* _(HttpServer.response.json({ status: 'error' }, { status: StatusCodes.SERVICE_UNAVAILABLE }))
          }),
      }),
    ),
  ),
  HttpServer.router.get(
    '/requests',
    Effect.gen(function* (_) {
      const notifications = yield* _(
        getNotifications,
        Effect.flatMap(
          Effect.forEach(
            ({ notification, timestamp }) =>
              Effect.gen(function* (_) {
                const work = yield* _(OpenAlex.getWork(notification.object['ietf:cite-as']))

                return {
                  timestamp,
                  preprint: notification.object['ietf:cite-as'],
                  language: Option.map(work, work => work.language),
                  topics: Option.match(work, {
                    onNone: () => [],
                    onSome: work => Array.map(work.topics, topic => topic.id),
                  }),
                  subfields: Option.match(work, {
                    onNone: () => [],
                    onSome: work => Array.dedupe(Array.map(work.topics, topic => topic.subfield.id)),
                  }),
                  fields: Option.match(work, {
                    onNone: () => [],
                    onSome: work => Array.dedupe(Array.map(work.topics, topic => topic.field.id)),
                  }),
                  domains: Option.match(work, {
                    onNone: () => [],
                    onSome: work => Array.dedupe(Array.map(work.topics, topic => topic.domain.id)),
                  }),
                }
              }),
            { batching: true, concurrency: 'inherit' },
          ),
        ),
      )

      return yield* _(HttpServer.response.schemaJson(RequestsSchema)(notifications))
    }),
  ),
  HttpServer.router.post(
    '/inbox',
    Effect.gen(function* (_) {
      const requestReview = yield* _(HttpServer.request.schemaBodyJson(CoarNotify.RequestReviewSchema))
      const encoded = yield* _(Schema.encode(CoarNotify.RequestReviewSchema)(requestReview))

      yield* _(
        BullMq.add('coar-notify', 'request-review', encoded, {
          jobId: BullMq.JobId(md5(requestReview.object['ietf:cite-as'])),
        }),
        Effect.acquireRelease((jobId, exit) =>
          Exit.matchEffect(exit, {
            onFailure: () =>
              Effect.catchAll(BullMq.remove('coar-notify', jobId), error =>
                Effect.annotateLogs(Effect.logError('Unable to remove job'), {
                  queue: 'coar-notify',
                  jobId,
                  message: error.message,
                }),
              ),
            onSuccess: () => Effect.void,
          }),
        ),
      )

      return yield* _(HttpServer.response.empty({ status: StatusCodes.CREATED }))
    }).pipe(
      Effect.catchTags({
        BullMqError: error =>
          Effect.gen(function* (_) {
            yield* _(
              Effect.logError('Unable to write job to BullMQ').pipe(Effect.annotateLogs({ message: error.message })),
            )

            return HttpServer.response.empty({ status: StatusCodes.SERVICE_UNAVAILABLE })
          }),
        ParseError: error =>
          Effect.gen(function* (_) {
            yield* _(
              Effect.logInfo('Invalid request').pipe(
                Effect.annotateLogs({ message: TreeFormatter.formatErrorSync(error) }),
              ),
            )

            return HttpServer.response.empty({ status: StatusCodes.BAD_REQUEST })
          }),
        RequestError: () => HttpServer.response.empty({ status: StatusCodes.BAD_REQUEST }),
      }),
    ),
  ),
  Effect.catchTag('RouteNotFound', () => HttpServer.response.empty({ status: StatusCodes.NOT_FOUND })),
)

const RequestsSchema = Schema.Array(
  Schema.Struct({
    timestamp: Temporal.InstantFromStringSchema,
    preprint: Doi.DoiSchema,
    language: Schema.optional(LanguageCode.LanguageCodeSchema, { nullable: true, as: 'Option' }),
    topics: Schema.Array(OpenAlex.TopicIdSchema),
    subfields: Schema.Array(OpenAlex.SubfieldIdSchema),
    fields: Schema.Array(OpenAlex.FieldIdSchema),
    domains: Schema.Array(OpenAlex.DomainIdSchema),
  }),
)

const md5 = (content: string) => createHash('md5').update(content).digest('hex')
