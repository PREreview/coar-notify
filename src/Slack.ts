import { HttpClient } from '@effect/platform'
import { Schema } from '@effect/schema'
import { Context, Data, Effect, type Scope } from 'effect'
import * as Url from './Url.js'

export interface SlackApiConfig {
  readonly accessToken: string
}

export const SlackApiConfig = Context.GenericTag<SlackApiConfig>('SlackApiConfig')

const PlainTextObjectSchema = Schema.struct({
  type: Schema.literal('plain_text'),
  text: Schema.string.pipe(Schema.nonEmpty()),
})

const MrkdwnTextObjectSchema = Schema.struct({
  type: Schema.literal('mrkdwn'),
  text: Schema.string.pipe(Schema.nonEmpty()),
})

const TextObjectSchema = Schema.union(PlainTextObjectSchema, MrkdwnTextObjectSchema)

const ButtonElementSchema = Schema.struct({
  type: Schema.literal('button'),
  text: PlainTextObjectSchema,
  url: Url.UrlSchema,
})

const SectionBlockSchema = Schema.struct({
  type: Schema.literal('section'),
  text: TextObjectSchema,
  accessory: Schema.optional(Schema.union(ButtonElementSchema)),
  fields: Schema.optional(Schema.array(TextObjectSchema)),
})

const BlockSchema = Schema.union(SectionBlockSchema)

const ChatPostMessageSchema = Schema.struct({
  channel: Schema.string,
  blocks: Schema.nonEmptyArray(BlockSchema),
  unfurl_links: Schema.optional(Schema.boolean),
  unfurl_media: Schema.optional(Schema.boolean),
})

const SuccessResponseSchema = Schema.struct({ ok: Schema.literal(true) })

const ErrorResponseSchema = Schema.struct({ ok: Schema.literal(false), error: Schema.string })

const SlackResponse = Schema.union(SuccessResponseSchema, ErrorResponseSchema)

export class SlackError extends Data.TaggedError('SlackError')<{
  readonly cause?: Error | undefined
  readonly message: string
}> {}

export const chatPostMessage = (
  message: Schema.Schema.To<typeof ChatPostMessageSchema>,
): Effect.Effect<void, SlackError, HttpClient.client.Client.Default | SlackApiConfig | Scope.Scope> =>
  Effect.gen(function* (_) {
    const client = yield* _(slackClient)

    const request = yield* _(
      HttpClient.request.post('chat.postMessage', { headers: {} }),
      HttpClient.request.setHeader('Content-Type', 'application/json'),
      HttpClient.request.schemaBody(ChatPostMessageSchema)(message),
    )

    const response = yield* _(client(request), Effect.flatMap(HttpClient.response.schemaBodyJson(SlackResponse)))

    if (!response.ok) {
      yield* _(Effect.fail(new SlackError({ message: response.error })))
    }
  }).pipe(
    Effect.catchTags({
      BodyError: toSlackError,
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
