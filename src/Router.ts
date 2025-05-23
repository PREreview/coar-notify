import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpMiddleware,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from '@effect/platform'
import { Array, Config, Context, Data, Effect, Exit, Match, Option, ParseResult, Schema, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { createHash } from 'node:crypto'
import slackifyMarkdown from 'slackify-markdown'
import * as BullMq from './BullMq.js'
import * as CoarNotify from './CoarNotify.js'
import * as Doi from './Doi.js'
import * as LanguageCode from './LanguageCode.js'
import * as OpenAlex from './OpenAlex/index.js'
import * as Preprint from './Preprint.js'
import * as Prereview from './Prereview.js'
import * as Redis from './Redis.js'
import { getNotifications } from './ReviewRequest.js'
import * as Slack from './Slack.js'
import * as Temporal from './Temporal.js'
import * as Url from './Url.js'

export const SlackShareChannelId = Context.GenericTag<Slack.SlackChannelId>('SlackShareChannelId')

export const PrereviewAuthToken = Context.GenericTag<string>('PrereviewAuthToken')

export class PublicUrl extends Context.Tag('PublicUrl')<PublicUrl, URL>() {}

class RedisTimeout extends Data.TaggedError('RedisTimeout') {
  readonly message = 'Connection timeout'
}

const NewPrereviewSchema = Schema.Struct({
  preprint: Schema.Struct({
    doi: Schema.optionalWith(Doi.DoiSchema, { exact: true }),
  }),
  doi: Doi.DoiSchema,
  url: Url.UrlFromStringSchema,
  author: Schema.Struct({
    name: Schema.NonEmptyTrimmedString,
  }),
})

export const Router = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/health',
    Effect.gen(function* () {
      yield* pipe(Redis.ping(), Effect.timeoutFail({ duration: '900 millis', onTimeout: () => new RedisTimeout() }))

      return yield* pipe(HttpServerResponse.json({ status: 'ok' }), HttpMiddleware.withLoggerDisabled)
    }).pipe(
      Effect.catchTags({
        RedisError: error =>
          Effect.gen(function* () {
            yield* Effect.logError('Unable to ping Redis').pipe(Effect.annotateLogs({ message: error.message }))

            return yield* HttpServerResponse.json({ status: 'error' }, { status: StatusCodes.SERVICE_UNAVAILABLE })
          }),
        RedisTimeout: error =>
          Effect.gen(function* () {
            yield* Effect.logError('Unable to ping Redis').pipe(Effect.annotateLogs({ message: error.message }))

            return yield* HttpServerResponse.json({ status: 'error' }, { status: StatusCodes.SERVICE_UNAVAILABLE })
          }),
      }),
    ),
  ),
  HttpRouter.get(
    '/requests',
    Effect.gen(function* () {
      const notifications = yield* pipe(
        getNotifications,
        Effect.flatMap(
          Effect.forEach(
            ({ notification, timestamp }) =>
              Effect.gen(function* () {
                const work = yield* OpenAlex.getWork(notification.object['ietf:cite-as'])

                return {
                  timestamp,
                  preprint: notification.object['ietf:cite-as'],
                  server: Option.orElse(
                    Option.flatMapNullable(work, work =>
                      Match.value(work.primary_location.source?.id).pipe(
                        Match.when('3005989158', () => 'chemrxiv' as const),
                        Match.when('4306400194', () => 'arxiv' as const),
                        Match.when('4306402450', () => 'research-square' as const),
                        Match.when('4306402567', () => 'biorxiv' as const),
                        Match.when('4306402488', () => 'ecoevorxiv' as const),
                        Match.when('4306402530', () => 'edarxiv' as const),
                        Match.when('4306400562', () => 'zenodo' as const),
                        Match.when('4306400573', () => 'medrxiv' as const),
                        Match.when('4306401127', () => 'osf-preprints' as const),
                        Match.when('4306401687', () => 'psyarxiv' as const),
                        Match.when('4306401597', () => 'scielo' as const),
                        Match.when('4306401210', () => 'engrxiv' as const),
                        Match.when('4306401238', () => 'socarxiv' as const),
                        Match.when('4306401687', () => 'psyarxiv' as const),
                        Match.orElse(() => null),
                      ),
                    ),
                    Option.liftNullable(() =>
                      Match.value(Doi.getRegistrant(notification.object['ietf:cite-as'])).pipe(
                        Match.when('1590', () => 'scielo' as const),
                        Match.when('5281', () => 'zenodo' as const),
                        Match.when('20944', () => 'preprints.org' as const),
                        Match.when('21203', () => 'research-square' as const),
                        Match.when('26434', () => 'chemrxiv' as const),
                        Match.when('31124', () => 'advance' as const),
                        Match.when('31219', () => 'osf-preprints' as const),
                        Match.when('31222', () => 'metaarxiv' as const),
                        Match.when('31224', () => 'engrxiv' as const),
                        Match.when('31234', () => 'psyarxiv' as const),
                        Match.when('31235', () => 'socarxiv' as const),
                        Match.when('32942', () => 'ecoevorxiv' as const),
                        Match.when('35542', () => 'edarxiv' as const),
                        Match.when('36227', () => 'techrxiv' as const),
                        Match.when('48550', () => 'arxiv' as const),
                        Match.when('60763', () => 'africarxiv' as const),
                        Match.orElse(() => null),
                      ),
                    ),
                  ),
                  language: Option.flatMapNullable(work, work => work.language),
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

      return yield* HttpServerResponse.schemaJson(RequestsSchema)(notifications)
    }),
  ),
  HttpRouter.post(
    '/prereviews',
    Effect.gen(function* () {
      const token = yield* PrereviewAuthToken
      yield* HttpServerRequest.schemaHeaders(Schema.Struct({ authorization: Schema.Literal(`Bearer ${token}`) }))

      const prereview = yield* HttpServerRequest.schemaBodyJson(NewPrereviewSchema)

      yield* Effect.all(
        [
          Slack.chatPostMessage({
            channel: yield* SlackShareChannelId,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: slackifyMarkdown(`${prereview.author.name} has published a PREreview: <${prereview.url.href}>`),
                },
              },
            ],
            unfurlLinks: true,
            unfurlMedia: false,
          }),
          notifyPreprintServer(prereview),
          notifyScietyCoarInbox(prereview.url),
        ],
        { concurrency: 'unbounded' },
      )

      return yield* HttpServerResponse.empty({ status: StatusCodes.CREATED })
    }),
  ),
  HttpRouter.post(
    '/inbox',
    Effect.gen(function* () {
      const requestReview = yield* HttpServerRequest.schemaBodyJson(CoarNotify.RequestReviewSchema)
      const encoded = yield* Schema.encode(CoarNotify.RequestReviewSchema)(requestReview)

      yield* pipe(
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

      return yield* HttpServerResponse.empty({ status: StatusCodes.CREATED })
    }).pipe(
      Effect.catchTags({
        BullMqError: error =>
          Effect.gen(function* () {
            yield* Effect.logError('Unable to write job to BullMQ').pipe(
              Effect.annotateLogs({ message: error.message }),
            )

            return HttpServerResponse.empty({ status: StatusCodes.SERVICE_UNAVAILABLE })
          }),
        ParseError: error =>
          Effect.gen(function* () {
            yield* Effect.logInfo('Invalid request').pipe(
              Effect.annotateLogs({ message: ParseResult.TreeFormatter.formatErrorSync(error) }),
            )

            return HttpServerResponse.empty({ status: StatusCodes.BAD_REQUEST })
          }),
        RequestError: () => HttpServerResponse.empty({ status: StatusCodes.BAD_REQUEST }),
      }),
    ),
  ),
  Effect.catchTag('RouteNotFound', () => HttpServerResponse.empty({ status: StatusCodes.NOT_FOUND })),
)

const RequestsSchema = Schema.Array(
  Schema.Struct({
    timestamp: Temporal.InstantFromStringSchema,
    preprint: Doi.DoiSchema,
    server: Schema.OptionFromNullOr(Preprint.PreprintServerSchema),
    language: Schema.OptionFromNullOr(LanguageCode.LanguageCodeSchema),
    topics: Schema.Array(OpenAlex.TopicIdSchema),
    subfields: Schema.Array(OpenAlex.SubfieldIdSchema),
    fields: Schema.Array(OpenAlex.FieldIdSchema),
    domains: Schema.Array(OpenAlex.DomainIdSchema),
  }),
)

const notifyPreprintServer = Effect.fn(function* (prereview: typeof NewPrereviewSchema.Type) {
  const canNotifyPreprintServer = yield* Config.withDefault(
    Config.literal(true, false, 'sandbox')('CAN_NOTIFY_PREPRINT_SERVER'),
    false,
  )
  if (canNotifyPreprintServer === false || !prereview.preprint.doi) {
    return
  }

  const prereviewUrl = yield* Prereview.PrereviewUrl
  const publicUrl = yield* PublicUrl

  const target: Option.Option<(typeof CoarNotify.AnnounceReviewSchema.Type)['target']> =
    canNotifyPreprintServer === 'sandbox'
      ? Option.some({
          id: new URL('https://coar-notify-inbox.fly.dev'),
          inbox: new URL('https://coar-notify-inbox.fly.dev/inbox'),
          type: 'Service',
        })
      : Doi.hasRegistrant('20944')(prereview.preprint.doi)
        ? Option.some({
            id: new URL('https://www.preprints.org/'),
            inbox: new URL('https://www.preprints.org/inbox'),
            type: 'Service',
          })
        : Option.none()

  if (Option.isNone(target)) {
    return
  }

  const message = CoarNotify.AnnounceReviewSchema.make({
    id: new URL(`urn:uuid:${crypto.randomUUID()}`),
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://coar-notify.net'],
    type: ['Announce', 'coar-notify:ReviewAction'],
    origin: {
      id: prereviewUrl,
      inbox: new URL(`${publicUrl.origin}/inbox`),
      type: 'Service',
    },
    target: target.value,
    context: {
      id: Doi.toUrl(prereview.preprint.doi),
      'ietf:cite-as': prereview.preprint.doi,
    },
    object: {
      id: prereview.url,
      'ietf:cite-as': prereview.doi,
      type: ['Page', 'sorg:Review'],
    },
  })

  yield* pipe(
    HttpClientRequest.post(message.target.inbox),
    HttpClientRequest.schemaBodyJson(CoarNotify.AnnounceReviewSchema)(message),
    Effect.andThen(HttpClient.execute),
    Effect.andThen(HttpClientResponse.filterStatusOk),
    Effect.tapError(error => Effect.logError('Failed to notify preprint server').pipe(Effect.annotateLogs({ error }))),
    Effect.scoped,
  )
})

const notifyScietyCoarInbox = (prereviewUrl: URL) =>
  Effect.gen(function* () {
    const canNotifySciety = yield* Config.withDefault(Config.boolean('CAN_NOTIFY_SCIETY'), false)
    if (!canNotifySciety) {
      return
    }

    const message = {
      id: `urn:uuid:${crypto.randomUUID()}`,
      '@context': ['https://www.w3.org/ns/activitystreams', 'https://purl.org/coar/notify'],
      type: ['Announce', 'coar-notify:ReviewAction'],
      origin: {
        id: 'https://sandbox.prereview.org/',
        inbox: 'https://coar-notify-sandbox.prereview.org/inbox',
        type: 'Service',
      },
      target: {
        id: 'https://staging.sciety.org/',
        inbox: 'https://inbox-sciety-staging.elifesciences.org/inbox',
        type: 'Service',
      },
      object: {
        id: prereviewUrl,
      },
    }

    yield* Effect.annotateLogs(Effect.logDebug('Should notify Sciety'), 'message', message)
  })

const md5 = (content: string) => createHash('md5').update(content).digest('hex')
