import { HttpClient } from '@effect/platform'
import { Effect } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Doi from './Doi.js'

export function writeAPrereviewUrl(doi: Doi.Doi) {
  return new URL(
    `https://prereview.org/preprints/doi-${doi
      .toLowerCase()
      .replaceAll('-', '+')
      .replaceAll('/', '-')}/write-a-prereview`,
  )
}

export const preprintIsReady = (doi: Doi.Doi): Effect.Effect<boolean, never, HttpClient.client.Client.Default> =>
  Effect.gen(function* (_) {
    const httpClient = yield* _(HttpClient.client.Client)

    const request = HttpClient.request.head(writeAPrereviewUrl(doi))

    const response = yield* _(httpClient(request))

    return response.status === StatusCodes.OK
  }).pipe(
    Effect.catchTags({
      RequestError: () => Effect.succeed(false),
      ResponseError: () => Effect.succeed(false),
    }),
    Effect.scoped,
  )
