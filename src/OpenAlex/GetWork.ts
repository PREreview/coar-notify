import { Effect, Request, RequestResolver } from 'effect'
import type * as Doi from '../Doi.js'
import * as OpenAlexApi from './OpenAlexApi.js'

export class GetWork extends Request.TaggedClass('GetWork')<
  OpenAlexApi.Work,
  OpenAlexApi.GetWorkError,
  { readonly doi: Doi.Doi }
> {}

export { GetWorkError } from './OpenAlexApi.js'

export const getWork = (
  doi: Doi.Doi,
): Effect.Effect<OpenAlexApi.Work, OpenAlexApi.GetWorkError, OpenAlexApi.OpenAlexApi> =>
  Effect.request(new GetWork({ doi }), GetWorkResolver).pipe(Effect.withRequestCaching(true))

export const GetWorkResolver: Effect.Effect<
  RequestResolver.RequestResolver<GetWork>,
  OpenAlexApi.GetWorkError,
  OpenAlexApi.OpenAlexApi
> = RequestResolver.fromEffect((request: GetWork) =>
  Effect.flatMap(OpenAlexApi.OpenAlexApi, openAlexApi => openAlexApi.getWork(request.doi)),
).pipe(RequestResolver.contextFromServices(OpenAlexApi.OpenAlexApi))
