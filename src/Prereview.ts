import { HttpClient, HttpClientRequest } from '@effect/platform'
import { Config, type ConfigError, Context, Effect, Equal, Layer } from 'effect'
import { StatusCodes } from 'http-status-codes'
import type * as Doi from './Doi.js'

export class PrereviewUrl extends Context.Tag('PrereviewUrl')<PrereviewUrl, URL>() {}

export function writeAPrereviewUrl(doi: Doi.Doi, prereviewUrl: URL) {
  return new URL(
    `${prereviewUrl.origin}/preprints/doi-${doi
      .toLowerCase()
      .replaceAll('-', '+')
      .replaceAll('/', '-')}/write-a-prereview`,
  )
}

export const preprintIsReady = (doi: Doi.Doi): Effect.Effect<boolean, never, HttpClient.HttpClient | PrereviewUrl> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const prereviewUrl = yield* PrereviewUrl

    const request = HttpClientRequest.head(writeAPrereviewUrl(doi, prereviewUrl))

    const response = yield* httpClient.execute(request)

    return Equal.equals(response.status, StatusCodes.OK)
  }).pipe(
    Effect.catchTags({
      RequestError: () => Effect.succeed(false),
      ResponseError: () => Effect.succeed(false),
    }),
    Effect.scoped,
  )

export const layer = (options: {
  url: typeof PrereviewUrl.Service
}): Layer.Layer<PrereviewUrl, ConfigError.ConfigError> =>
  Layer.succeedContext(Context.empty().pipe(Context.add(PrereviewUrl, options.url)))

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
