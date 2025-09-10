import { FetchHttpClient } from '@effect/platform'
import { Config, Context, Data, Effect, Layer, Option, Redacted, identity } from 'effect'
import * as OAI from 'openai'

export class OpenAiError extends Data.TaggedError('OpenAiError')<{
  readonly cause?: Error
  readonly message: string
}> {}

interface OpenAiService {
  readonly createChatCompletion: (
    body: OAI.OpenAI.ChatCompletionCreateParamsNonStreaming,
  ) => Effect.Effect<string, OpenAiError>
}

const make = (params: { readonly apiKey: Redacted.Redacted }) =>
  Effect.gen(function* () {
    const fetchService = yield* Effect.serviceOption(FetchHttpClient.Fetch)
    const fetch = Option.match(fetchService, { onNone: () => globalThis.fetch, onSome: identity })

    const client = new OAI.OpenAI({
      apiKey: Redacted.value(params.apiKey),
      fetch,
    })

    const createChatCompletion: OpenAiService['createChatCompletion'] = body =>
      Effect.flatMap(
        Effect.tryPromise({
          try: signal => client.chat.completions.create(body, { signal }),
          catch: toOpenAiError,
        }),
        completion => Option.fromNullable(completion.choices[0]?.message?.content).pipe(Effect.mapError(toOpenAiError)),
      )

    return {
      createChatCompletion,
    } as OpenAiService
  })

export const createChatCompletion = (
  body: OAI.OpenAI.ChatCompletionCreateParamsNonStreaming,
): Effect.Effect<string, OpenAiError, OpenAi> =>
  Effect.gen(function* () {
    const openAi = yield* OpenAi

    return yield* openAi.createChatCompletion(body)
  })

export class OpenAiConfig extends Context.Tag('OpenAiConfig')<OpenAiConfig, Parameters<typeof make>[0]>() {
  static layer = (config: Config.Config.Wrap<Parameters<typeof make>[0]>) => Layer.effect(this, Config.unwrap(config))
}

export class OpenAi extends Context.Tag('OpenAi')<OpenAi, OpenAiService>() {
  static Live = Layer.effect(OpenAi, Effect.flatMap(OpenAiConfig, make))
}

const toOpenAiError = (error: unknown): OpenAiError =>
  new OpenAiError(error instanceof Error ? { cause: error, message: error.message } : { message: String(error) })
