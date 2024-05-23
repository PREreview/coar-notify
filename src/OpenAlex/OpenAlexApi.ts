import { HttpClient } from '@effect/platform'
import { ParseResult, Schema } from '@effect/schema'
import { Brand, Context, Data, Effect, Either, Equal, Layer, RateLimiter, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Doi from '../Doi.js'
import * as Url from '../Url.js'

export type Work = Schema.Schema.Type<typeof WorkSchema>

export type ListOfWorks = Schema.Schema.Type<typeof ListOfWorksSchema>

export class GetWorkError extends Data.TaggedError('GetWorkError')<{
  readonly cause?: HttpClient.error.HttpClientError | ParseResult.ParseError | undefined
  readonly message: string
}> {
  static fromError = (error: HttpClient.error.HttpClientError | ParseResult.ParseError) =>
    new GetWorkError({
      cause: error,
      message: error.message,
    })
}

export class ListWorksError extends Data.TaggedError('ListWorksError')<{
  readonly cause?: HttpClient.error.HttpClientError | ParseResult.ParseError | undefined
  readonly message: string
}> {
  static fromError = (error: HttpClient.error.HttpClientError | ParseResult.ParseError) =>
    new ListWorksError({
      cause: error,
      message: error.message,
    })
}

export class OpenAlexApi extends Context.Tag('OpenAlexApi')<
  OpenAlexApi,
  {
    readonly getWork: (id: Doi.Doi) => Effect.Effect<Work, GetWorkError>
    readonly listWorks: (params: HttpClient.urlParams.Input) => Effect.Effect<ListOfWorks, ListWorksError>
  }
>() {}

export const OpenAlexApiLive = Layer.scoped(
  OpenAlexApi,
  Effect.gen(function* (_) {
    const httpClient = yield* _(HttpClient.client.Client)
    const rateLimit = yield* _(RateLimiter.make({ limit: 10, interval: '1.5 seconds', algorithm: 'fixed-window' }))

    const getWork = (id: Doi.Doi) =>
      pipe(
        HttpClient.request.get(`https://api.openalex.org/works/${encodeURIComponent(Doi.toUrl(id).href)}`),
        HttpClient.request.acceptJson,
        HttpClient.client.filterStatus(httpClient, status => Equal.equals(status, StatusCodes.OK)),
        Effect.flatMap(HttpClient.response.schemaBodyJson(WorkSchema)),
        Effect.scoped,
        Effect.catchAll(GetWorkError.fromError),
        rateLimit,
      )

    const listWorks = (params: HttpClient.urlParams.Input) =>
      pipe(
        HttpClient.request.get('https://api.openalex.org/works'),
        HttpClient.request.setUrlParams(params),
        HttpClient.request.acceptJson,
        HttpClient.client.filterStatus(httpClient, status => Equal.equals(status, StatusCodes.OK)),
        Effect.flatMap(HttpClient.response.schemaBodyJson(ListOfWorksSchema)),
        Effect.scoped,
        Effect.catchAll(ListWorksError.fromError),
        rateLimit,
      )

    return { getWork, listWorks }
  }),
)

export type FieldId = string & Brand.Brand<'OpenAlexFieldId'>

export const FieldId = Brand.nominal<FieldId>()

const FieldIdSchema = Schema.String.pipe(Schema.fromBrand(FieldId))

const FieldIdFromUrlSchema = Schema.transformOrFail(Url.UrlFromSelfSchema, FieldIdSchema, {
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/fields/')
      ? Either.right(decodeURIComponent(url.pathname.substring(8)))
      : Either.left(new ParseResult.Type(ast, url)),
  encode: topicId => ParseResult.succeed(new URL(`https://openalex.org/fields/${encodeURIComponent(topicId)}`)),
})

export const WorkSchema = Schema.Struct({
  doi: Doi.DoiFromUrlSchema,
  topics: Schema.Array(
    Schema.Struct({
      field: Schema.Struct({
        id: Schema.compose(Url.UrlFromStringSchema, FieldIdFromUrlSchema),
      }),
    }),
  ),
})

export const ListOfWorksSchema = Schema.Struct({
  results: Schema.Array(WorkSchema),
})
