import { HttpClient } from '@effect/platform'
import { Schema } from '@effect/schema'
import { Brand, Context, Data, Effect } from 'effect'
import * as Url from './Url.js'

export interface SlackApiConfig {
  readonly accessToken: string
}

export const SlackApiConfig = Context.GenericTag<SlackApiConfig>('SlackApiConfig')

export type SlackChannelId = string & Brand.Brand<'SlackChannelId'>

export const SlackChannelId = Brand.nominal<SlackChannelId>()

const ChannelIdSchema = Schema.fromBrand(SlackChannelId)(Schema.string)

export type SlackTimestamp = string & Brand.Brand<'SlackTimestamp'>

export const SlackTimestamp = Brand.nominal<SlackTimestamp>()

const TimestampSchema = Schema.fromBrand(SlackTimestamp)(Schema.string)

const PlainTextObjectSchema = Schema.struct({
  type: Schema.literal('plain_text'),
  text: Schema.string.pipe(Schema.nonEmpty()),
})

const MrkdwnTextObjectSchema = Schema.struct({
  type: Schema.literal('mrkdwn'),
  text: Schema.string.pipe(Schema.nonEmpty()),
})

const TextObjectSchema = Schema.union(PlainTextObjectSchema, MrkdwnTextObjectSchema)

export type SlackTextObject = Schema.Schema.Type<typeof TextObjectSchema>

const ButtonElementSchema = Schema.struct({
  type: Schema.literal('button'),
  text: PlainTextObjectSchema,
  style: Schema.optional(Schema.literal('primary', 'danger')),
  url: Url.UrlSchema,
})

export type SlackButtonElement = Schema.Schema.Type<typeof ButtonElementSchema>

const ActionsBlockSchema = Schema.struct({
  type: Schema.literal('actions'),
  elements: Schema.nonEmptyArray(ButtonElementSchema),
})

const ContextBlockSchema = Schema.struct({
  type: Schema.literal('context'),
  elements: Schema.nonEmptyArray(TextObjectSchema),
})

const SectionBlockSchema = Schema.struct({
  type: Schema.literal('section'),
  text: TextObjectSchema,
  accessory: Schema.optional(Schema.union(ButtonElementSchema)),
  fields: Schema.optional(Schema.array(TextObjectSchema)),
})

export const BlockSchema = Schema.union(ActionsBlockSchema, ContextBlockSchema, SectionBlockSchema)

export type SlackBlock = Schema.Schema.Type<typeof BlockSchema>

const ChatPostMessageSchema = Schema.struct({
  channel: ChannelIdSchema,
  blocks: Schema.nonEmptyArray(BlockSchema),
  thread: Schema.optional(TimestampSchema).pipe(Schema.fromKey('thread_ts')),
  unfurlLinks: Schema.optional(Schema.boolean).pipe(Schema.fromKey('unfurl_links')),
  unfurlMedia: Schema.optional(Schema.boolean).pipe(Schema.fromKey('unfurl_media')),
})

const ChatGetPermalinkSchema = Schema.struct({
  channel: ChannelIdSchema,
  timestamp: Schema.propertySignature(TimestampSchema).pipe(Schema.fromKey('message_ts')),
})

const SuccessResponseSchema = <Fields extends Schema.Struct.Fields>(schema: Schema.struct<Fields>) =>
  Schema.struct({ ...schema.fields, ok: Schema.literal(true) })

const ErrorResponseSchema = Schema.struct({ ok: Schema.literal(false), error: Schema.string })

const SlackResponse = <Fields extends Schema.Struct.Fields>(schema: Schema.struct<Fields>) =>
  Schema.union(SuccessResponseSchema(schema), ErrorResponseSchema)

const ChatPostMessageResponseSchema = SlackResponse(Schema.struct({ channel: ChannelIdSchema, ts: TimestampSchema }))

const ChatGetPermalinkResponseSchema = SlackResponse(Schema.struct({ permalink: Url.UrlSchema }))

export class SlackError extends Data.TaggedError('SlackError')<{
  readonly cause?: Error | undefined
  readonly message: string
}> {}

export const chatPostMessage = (
  message: Schema.Schema.Type<typeof ChatPostMessageSchema>,
): Effect.Effect<
  { readonly channel: SlackChannelId; readonly timestamp: SlackTimestamp },
  SlackError,
  HttpClient.client.Client.Default | SlackApiConfig
> =>
  Effect.gen(function* (_) {
    const client = yield* _(slackClient)

    const request = yield* _(
      HttpClient.request.post('chat.postMessage', { headers: {} }),
      HttpClient.request.setHeader('Content-Type', 'application/json'),
      HttpClient.request.schemaBody(ChatPostMessageSchema)(message),
    )

    const response = yield* _(
      client(request),
      Effect.flatMap(HttpClient.response.schemaBodyJson(ChatPostMessageResponseSchema)),
      Effect.scoped,
    )

    if (!response.ok) {
      return yield* _(Effect.fail(new SlackError({ message: response.error })))
    }

    return { channel: response.channel, timestamp: response.ts }
  }).pipe(
    Effect.catchTags({
      BodyError: toSlackError,
      ParseError: toSlackError,
      RequestError: httpToSlackError,
      ResponseError: httpToSlackError,
    }),
  )

export const chatGetPermalink = (
  message: Schema.Schema.Type<typeof ChatGetPermalinkSchema>,
): Effect.Effect<URL, SlackError, HttpClient.client.Client.Default | SlackApiConfig> =>
  Effect.gen(function* (_) {
    const client = yield* _(slackClient)

    const urlParams = yield* _(Schema.encode(ChatGetPermalinkSchema)(message))

    const request = HttpClient.request.get('chat.getPermalink', { urlParams })

    const response = yield* _(
      client(request),
      Effect.flatMap(HttpClient.response.schemaBodyJson(ChatGetPermalinkResponseSchema)),
      Effect.scoped,
    )

    if (!response.ok) {
      return yield* _(Effect.fail(new SlackError({ message: response.error })))
    }

    return response.permalink
  }).pipe(
    Effect.catchTags({
      ParseError: toSlackError,
      RequestError: httpToSlackError,
      ResponseError: httpToSlackError,
    }),
  )

const slackClient = Effect.gen(function* (_) {
  const httpClient = yield* _(HttpClient.client.Client)
  const { accessToken } = yield* _(SlackApiConfig)

  return httpClient.pipe(
    HttpClient.client.mapRequest(HttpClient.request.acceptJson),
    HttpClient.client.mapRequest(HttpClient.request.prependUrl('https://slack.com/api/')),
    HttpClient.client.mapRequest(HttpClient.request.bearerToken(accessToken)),
  )
})

const toSlackError = (error: unknown): SlackError => {
  return new SlackError(error instanceof Error ? { cause: error, message: error.message } : { message: String(error) })
}

const httpToSlackError = (error: HttpClient.error.HttpClientError): SlackError => {
  return new SlackError({ cause: error.error instanceof Error ? error.error : undefined, message: error.reason })
}
