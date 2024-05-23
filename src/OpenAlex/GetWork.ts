import { HttpClient } from '@effect/platform'
import { Effect, Equal, type Option, Request, RequestResolver } from 'effect'
import { StatusCodes } from 'http-status-codes'
import type * as Doi from '../Doi.js'
import * as OpenAlexApi from './OpenAlexApi.js'

export class GetWork extends Request.TaggedClass('GetWork')<
  Option.Option<OpenAlexApi.Work>,
  OpenAlexApi.GetWorkError,
  { readonly doi: Doi.Doi }
> {}

export { GetWorkError } from './OpenAlexApi.js'

export const getWork = (
  doi: Doi.Doi,
): Effect.Effect<Option.Option<OpenAlexApi.Work>, OpenAlexApi.GetWorkError, OpenAlexApi.OpenAlexApi> =>
  Effect.request(new GetWork({ doi }), GetWorkResolver).pipe(Effect.withRequestCaching(true))

export const GetWorkResolver: Effect.Effect<
  RequestResolver.RequestResolver<GetWork>,
  OpenAlexApi.GetWorkError,
  OpenAlexApi.OpenAlexApi
> = RequestResolver.fromEffect((request: GetWork) =>
  Effect.flatMap(OpenAlexApi.OpenAlexApi, openAlexApi => openAlexApi.getWork(request.doi)).pipe(
    Effect.asSome,
    Effect.catchIf(
      error =>
        error.cause instanceof HttpClient.error.ResponseError &&
        error.cause.reason === 'StatusCode' &&
        Equal.equals(error.cause.response.status, StatusCodes.NOT_FOUND),
      () => Effect.succeedNone,
    ),
  ),
).pipe(RequestResolver.contextFromServices(OpenAlexApi.OpenAlexApi))
