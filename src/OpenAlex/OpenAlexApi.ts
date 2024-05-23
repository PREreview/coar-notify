import { HttpClient } from '@effect/platform'
import { ParseResult, Schema } from '@effect/schema'
import { Brand, Context, Data, Effect, Either, Equal, Layer, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Doi from '../Doi.js'
import * as Url from '../Url.js'

export type Work = Schema.Schema.Type<typeof WorkSchema>

export class GetWorkError extends Data.TaggedError('GetWorkError')<{
  readonly cause?: HttpClient.error.HttpClientError | ParseResult.ParseError
  readonly message: string
}> {
  static fromError = (error: HttpClient.error.HttpClientError | ParseResult.ParseError) =>
    new GetWorkError({
      cause: error,
      message: error.message,
    })
}

export const getWork = (id: Doi.Doi) => Effect.flatMap(OpenAlexApi, openAlexApi => openAlexApi.getWork(id))

export class OpenAlexApi extends Context.Tag('OpenAlexApi')<
  OpenAlexApi,
  {
    readonly getWork: (id: Doi.Doi) => Effect.Effect<Work, GetWorkError>
  }
>() {}

export const OpenAlexApiLive = Layer.effect(
  OpenAlexApi,
  Effect.gen(function* (_) {
    const httpClient = yield* _(HttpClient.client.Client)

    const getWork = (id: Doi.Doi) =>
      pipe(
        HttpClient.request.get(`https://api.openalex.org/works/${encodeURIComponent(Doi.toUrl(id).href)}`),
        HttpClient.request.acceptJson,
        HttpClient.client.filterStatus(httpClient, status => Equal.equals(status, StatusCodes.OK)),
        Effect.flatMap(HttpClient.response.schemaBodyJson(WorkSchema)),
        Effect.scoped,
        Effect.catchAll(GetWorkError.fromError),
      )

    return { getWork }
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
