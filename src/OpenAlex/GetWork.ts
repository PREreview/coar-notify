import { HttpClient } from '@effect/platform'
import { Array, Effect, Equal, type Option, Request, RequestResolver, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import type * as Doi from '../Doi.js'
import * as OpenAlexApi from './OpenAlexApi.js'

export class GetWork extends Request.TaggedClass('GetWork')<
  Option.Option<OpenAlexApi.Work>,
  OpenAlexApi.GetWorkError | OpenAlexApi.ListWorksError,
  { readonly doi: Doi.Doi }
> {}

export { GetWorkError } from './OpenAlexApi.js'

export const getWork = (
  doi: Doi.Doi,
): Effect.Effect<
  Option.Option<OpenAlexApi.Work>,
  OpenAlexApi.GetWorkError | OpenAlexApi.ListWorksError,
  OpenAlexApi.OpenAlexApi
> => Effect.request(new GetWork({ doi }), GetWorkResolver).pipe(Effect.withRequestCaching(true))

export const GetWorkResolver: Effect.Effect<
  RequestResolver.RequestResolver<GetWork>,
  never,
  OpenAlexApi.OpenAlexApi
> = RequestResolver.makeBatched((requests: Array.NonEmptyArray<GetWork>) =>
  Effect.forEach(Array.chunksOf(requests, 50), getWorks, { concurrency: 'inherit' }),
).pipe(RequestResolver.contextFromServices(OpenAlexApi.OpenAlexApi))

const getWorks = (requests: Array.NonEmptyArray<GetWork>) =>
  requests.length === 1 ? getSingleWork(requests[0]) : getPageOfWorks(requests)

const getSingleWork = (request: GetWork) =>
  Effect.flatMap(OpenAlexApi.OpenAlexApi, openAlexApi => openAlexApi.getWork(request.doi)).pipe(
    Effect.asSome,
    Effect.catchIf(
      error =>
        error.cause instanceof HttpClient.error.ResponseError &&
        error.cause.reason === 'StatusCode' &&
        Equal.equals(error.cause.response.status, StatusCodes.NOT_FOUND),
      () => Effect.succeedNone,
    ),
    Effect.exit,
    Effect.flatMap(result => Request.complete(request, result)),
  )

const getPageOfWorks = (requests: Array.NonEmptyArray<GetWork>) =>
  pipe(
    Effect.flatMap(OpenAlexApi.OpenAlexApi, openAlexApi =>
      openAlexApi.listWorks({
        filter: `doi:${Array.join(
          Array.map(requests, request => request.doi),
          '|',
        )}`,
        'per-page': requests.length.toString(),
      }),
    ),
    Effect.flatMap(({ results }) =>
      Effect.forEach(
        requests,
        request =>
          Request.succeed(
            request,
            Array.findFirst(results, result => result.doi.toLowerCase() === request.doi.toLowerCase()),
          ),
        { concurrency: 'unbounded' },
      ),
    ),
    Effect.catchAll(error =>
      Effect.forEach(requests, request => Request.fail(request, error), { concurrency: 'unbounded' }),
    ),
    Effect.asVoid,
  )
