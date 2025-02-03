import { HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { Brand, Context, Data, Effect, Schema } from 'effect'
import * as Url from './Url.js'

export interface SlackApiConfig {
  readonly accessToken: string
}

export const SlackApiConfig = Context.GenericTag<SlackApiConfig>('SlackApiConfig')

export type SlackChannelId = string & Brand.Brand<'SlackChannelId'>

export const SlackChannelId = Brand.nominal<SlackChannelId>()

const ChannelIdSchema = Schema.fromBrand(SlackChannelId)(Schema.String)

export type SlackTimestamp = string & Brand.Brand<'SlackTimestamp'>

export const SlackTimestamp = Brand.nominal<SlackTimestamp>()

const TimestampSchema = Schema.fromBrand(SlackTimestamp)(Schema.String)

const PlainTextObjectSchema = Schema.Struct({
  type: Schema.Literal('plain_text'),
  text: Schema.NonEmptyString,
})

const MrkdwnTextObjectSchema = Schema.Struct({
  type: Schema.Literal('mrkdwn'),
  text: Schema.NonEmptyString,
})

const TextObjectSchema = Schema.Union(PlainTextObjectSchema, MrkdwnTextObjectSchema)

export type SlackTextObject = Schema.Schema.Type<typeof TextObjectSchema>

const ButtonElementSchema = Schema.Struct({
  type: Schema.Literal('button'),
  text: PlainTextObjectSchema,
  style: Schema.optional(Schema.Literal('primary', 'danger')),
  url: Url.UrlFromStringSchema,
})

export type SlackButtonElement = Schema.Schema.Type<typeof ButtonElementSchema>

const ActionsBlockSchema = Schema.Struct({
  type: Schema.Literal('actions'),
  elements: Schema.NonEmptyArray(ButtonElementSchema),
})

const ContextBlockSchema = Schema.Struct({
  type: Schema.Literal('context'),
  elements: Schema.NonEmptyArray(TextObjectSchema),
})

const SectionBlockSchema = Schema.Struct({
  type: Schema.Literal('section'),
  text: TextObjectSchema,
  accessory: Schema.optional(Schema.Union(ButtonElementSchema)),
  fields: Schema.optional(Schema.Array(TextObjectSchema)),
})

export const BlockSchema = Schema.Union(ActionsBlockSchema, ContextBlockSchema, SectionBlockSchema)

export type SlackBlock = Schema.Schema.Type<typeof BlockSchema>

export type ChatPostMessage = Schema.Schema.Type<typeof ChatPostMessageSchema>

const ChatPostMessageSchema = Schema.Struct({
  channel: ChannelIdSchema,
  blocks: Schema.NonEmptyArray(BlockSchema),
  thread: Schema.optional(TimestampSchema).pipe(Schema.fromKey('thread_ts')),
  unfurlLinks: Schema.optional(Schema.Boolean).pipe(Schema.fromKey('unfurl_links')),
  unfurlMedia: Schema.optional(Schema.Boolean).pipe(Schema.fromKey('unfurl_media')),
})

const ChatDeleteSchema = Schema.Struct({
  channel: ChannelIdSchema,
  timestamp: Schema.propertySignature(TimestampSchema).pipe(Schema.fromKey('ts')),
})

const ChatGetPermalinkSchema = Schema.Struct({
  channel: ChannelIdSchema,
  timestamp: Schema.propertySignature(TimestampSchema).pipe(Schema.fromKey('message_ts')),
})

const SuccessResponseSchema = <Fields extends Schema.Struct.Fields>(schema: Schema.Struct<Fields>) =>
  Schema.Struct({ ...schema.fields, ok: Schema.Literal(true) })

const ErrorResponseSchema = Schema.Struct({ ok: Schema.Literal(false), error: Schema.String })

const SlackResponse = <Fields extends Schema.Struct.Fields>(schema: Schema.Struct<Fields>) =>
  Schema.Union(SuccessResponseSchema(schema), ErrorResponseSchema)

const ChatPostMessageResponseSchema = SlackResponse(Schema.Struct({ channel: ChannelIdSchema, ts: TimestampSchema }))

const ChatDeleteResponseSchema = SlackResponse(Schema.Struct({ channel: ChannelIdSchema, ts: TimestampSchema }))

const ChatGetPermalinkResponseSchema = SlackResponse(Schema.Struct({ permalink: Url.UrlFromStringSchema }))

export class SlackError extends Data.TaggedError('SlackError')<{
  readonly cause?: Error | undefined
  readonly message: string
}> {}

export const chatPostMessage = (
  message: Schema.Schema.Type<typeof ChatPostMessageSchema>,
): Effect.Effect<
  { readonly channel: SlackChannelId; readonly timestamp: SlackTimestamp },
  SlackError,
  HttpClient.HttpClient | SlackApiConfig
> =>
  Effect.gen(function* (_) {
    const client = yield* _(slackClient)

    const request = yield* _(
      HttpClientRequest.post('chat.postMessage', { headers: {} }),
      HttpClientRequest.setHeader('Content-Type', 'application/json'),
      HttpClientRequest.schemaBodyJson(ChatPostMessageSchema)(message),
    )

    const response = yield* _(
      client.execute(request),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(ChatPostMessageResponseSchema)),
      Effect.scoped,
    )

    if (!response.ok) {
      return yield* _(Effect.fail(new SlackError({ message: response.error })))
    }

    return { channel: response.channel, timestamp: response.ts }
  }).pipe(
    Effect.catchTags({
      HttpBodyError: toSlackError,
      ParseError: toSlackError,
      RequestError: httpToSlackError,
      ResponseError: httpToSlackError,
    }),
  )

export const chatDelete = (
  message: Schema.Schema.Type<typeof ChatDeleteSchema>,
): Effect.Effect<void, SlackError, HttpClient.HttpClient | SlackApiConfig> =>
  Effect.gen(function* (_) {
    const client = yield* _(slackClient)

    const request = yield* _(
      HttpClientRequest.post('chat.delete'),
      HttpClientRequest.setHeader('Content-Type', 'application/json'),
      HttpClientRequest.schemaBodyJson(ChatDeleteSchema)(message),
    )

    const response = yield* _(
      client.execute(request),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(ChatDeleteResponseSchema)),
      Effect.scoped,
    )

    if (!response.ok) {
      return yield* _(Effect.fail(new SlackError({ message: response.error })))
    }

    return { channel: response.channel, timestamp: response.ts }
  }).pipe(
    Effect.catchTags({
      HttpBodyError: toSlackError,
      ParseError: toSlackError,
      RequestError: httpToSlackError,
      ResponseError: httpToSlackError,
    }),
  )

export const chatGetPermalink = (
  message: Schema.Schema.Type<typeof ChatGetPermalinkSchema>,
): Effect.Effect<URL, SlackError, HttpClient.HttpClient | SlackApiConfig> =>
  Effect.gen(function* (_) {
    const client = yield* _(slackClient)

    const urlParams = yield* _(Schema.encode(ChatGetPermalinkSchema)(message))

    const request = HttpClientRequest.get('chat.getPermalink', { urlParams })

    const response = yield* _(
      client.execute(request),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(ChatGetPermalinkResponseSchema)),
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
  const httpClient = yield* _(HttpClient.HttpClient)
  const { accessToken } = yield* _(SlackApiConfig)

  return httpClient.pipe(
    HttpClient.mapRequest(HttpClientRequest.acceptJson),
    HttpClient.mapRequest(HttpClientRequest.prependUrl('https://slack.com/api/')),
    HttpClient.mapRequest(HttpClientRequest.bearerToken(accessToken)),
  )
})

const toSlackError = (error: unknown): SlackError => {
  return new SlackError(error instanceof Error ? { cause: error, message: error.message } : { message: String(error) })
}

const httpToSlackError = (error: HttpClientError.HttpClientError): SlackError => {
  return new SlackError({ cause: error.cause instanceof Error ? error.cause : undefined, message: error.reason })
}
