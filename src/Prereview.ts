import { HttpClient, HttpClientRequest } from '@effect/platform'
import { Effect, Equal } from 'effect'
import { StatusCodes } from 'http-status-codes'
import type * as Doi from './Doi.js'

export function writeAPrereviewUrl(doi: Doi.Doi) {
  return new URL(
    `https://prereview.org/preprints/doi-${doi
      .toLowerCase()
      .replaceAll('-', '+')
      .replaceAll('/', '-')}/write-a-prereview`,
  )
}

export const preprintIsReady = (doi: Doi.Doi): Effect.Effect<boolean, never, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient

    const request = HttpClientRequest.head(writeAPrereviewUrl(doi))

    const response = yield* httpClient.execute(request)

    return Equal.equals(response.status, StatusCodes.OK)
  }).pipe(
    Effect.catchTags({
      RequestError: () => Effect.succeed(false),
      ResponseError: () => Effect.succeed(false),
    }),
    Effect.scoped,
  )
