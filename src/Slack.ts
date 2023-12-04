import { HttpClient } from '@effect/platform'
import { Schema } from '@effect/schema'
import { Context, Data, Effect } from 'effect'

export interface SlackApiConfig {
  readonly accessToken: string
}

export const SlackApiConfig = Context.Tag<SlackApiConfig>()

const PlainTextObjectSchema = Schema.struct({
  type: Schema.literal('plain_text'),
  text: Schema.string.pipe(Schema.nonEmpty()),
})

const MrkdwnTextObjectSchema = Schema.struct({
  type: Schema.literal('mrkdwn'),
  text: Schema.string.pipe(Schema.nonEmpty()),
})

const TextObjectSchema = Schema.union(PlainTextObjectSchema, MrkdwnTextObjectSchema)

const SectionBlockSchema = Schema.struct({
  type: Schema.literal('section'),
  text: TextObjectSchema,
})

const BlockSchema = Schema.union(SectionBlockSchema)

const ChatPostMessageSchema = Schema.struct({
  channel: Schema.string,
  blocks: Schema.nonEmptyArray(BlockSchema),
})

const SuccessResponseSchema = Schema.struct({ ok: Schema.literal(true) })

const ErrorResponseSchema = Schema.struct({ ok: Schema.literal(false), error: Schema.string })

const SlackResponse = Schema.union(SuccessResponseSchema, ErrorResponseSchema)

class SlackErrorResponse extends Data.TaggedError('SlackErrorResponse')<{ message: string }> {}

export const chatPostMessage = (
  message: Schema.Schema.To<typeof ChatPostMessageSchema>,
): Effect.Effect<
  HttpClient.client.Client.Default | SlackApiConfig,
  HttpClient.error.HttpClientError | SlackErrorResponse,
  void
> =>
  Effect.gen(function* (_) {
    const client = yield* _(slackClient)

    const request = yield* _(
      HttpClient.request.post('chat.postMessage', { headers: {} }),
      HttpClient.request.setHeader('Content-Type', 'application/json'),
      HttpClient.request.schemaBody(ChatPostMessageSchema)(message),
    )

    const response = yield* _(client(request), Effect.flatMap(HttpClient.response.schemaBodyJson(SlackResponse)))

    if (!response.ok) {
      yield* _(Effect.fail(new SlackErrorResponse({ message: response.error })))
    }
  }).pipe(
    Effect.catchTags({
      BodyError: Effect.die,
      ParseError: Effect.die,
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
