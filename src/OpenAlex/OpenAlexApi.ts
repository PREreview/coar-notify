import {
  HttpClient,
  type HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
  type UrlParams,
} from '@effect/platform'
import { Brand, Context, Data, Effect, Either, Equal, Layer, ParseResult, RateLimiter, Schema, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Doi from '../Doi.js'
import * as LanguageCode from '../LanguageCode.js'
import * as Url from '../Url.js'

export type Work = Schema.Schema.Type<typeof WorkSchema>

export type ListOfWorks = Schema.Schema.Type<typeof ListOfWorksSchema>

export class GetWorkError extends Data.TaggedError('GetWorkError')<{
  readonly cause?: HttpClientError.HttpClientError | ParseResult.ParseError | undefined
  readonly message: string
}> {
  static fromError = (error: HttpClientError.HttpClientError | ParseResult.ParseError) =>
    new GetWorkError({
      cause: error,
      message: error.message,
    })
}

export class ListWorksError extends Data.TaggedError('ListWorksError')<{
  readonly cause?: HttpClientError.HttpClientError | ParseResult.ParseError | undefined
  readonly message: string
}> {
  static fromError = (error: HttpClientError.HttpClientError | ParseResult.ParseError) =>
    new ListWorksError({
      cause: error,
      message: error.message,
    })
}

export class OpenAlexApi extends Context.Tag('OpenAlexApi')<
  OpenAlexApi,
  {
    readonly getWork: (id: Doi.Doi) => Effect.Effect<Work, GetWorkError>
    readonly listWorks: (params: UrlParams.Input) => Effect.Effect<ListOfWorks, ListWorksError>
  }
>() {}

export const OpenAlexApiLive = Layer.scoped(
  OpenAlexApi,
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const rateLimit = yield* RateLimiter.make({ limit: 10, interval: '1.5 seconds', algorithm: 'fixed-window' })

    const getWork = (id: Doi.Doi) =>
      pipe(
        HttpClientRequest.get(`https://api.openalex.org/works/${encodeURIComponent(Doi.toUrl(id).href)}`),
        HttpClientRequest.acceptJson,
        HttpClient.filterStatus(httpClient, status => Equal.equals(status, StatusCodes.OK)).execute,
        Effect.flatMap(HttpClientResponse.schemaBodyJson(WorkSchema)),
        Effect.scoped,
        Effect.catchAll(GetWorkError.fromError),
        rateLimit,
      )

    const listWorks = (params: UrlParams.Input) =>
      pipe(
        HttpClientRequest.get('https://api.openalex.org/works'),
        HttpClientRequest.setUrlParams(params),
        HttpClientRequest.acceptJson,
        HttpClient.filterStatus(httpClient, status => Equal.equals(status, StatusCodes.OK)).execute,
        Effect.flatMap(HttpClientResponse.schemaBodyJson(ListOfWorksSchema)),
        Effect.scoped,
        Effect.catchAll(ListWorksError.fromError),
        rateLimit,
      )

    return { getWork, listWorks }
  }),
)

export type SourceId = string & Brand.Brand<'OpenAlexSourceId'>

export const SourceId = Brand.nominal<SourceId>()

const SourceIdSchema = Schema.String.pipe(Schema.fromBrand(SourceId))

const SourceIdFromUrlSchema = Schema.transformOrFail(Url.UrlFromSelfSchema, SourceIdSchema, {
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/S')
      ? Either.right(decodeURIComponent(url.pathname.substring(2)))
      : Either.left(new ParseResult.Type(ast, url)),
  encode: sourceId => ParseResult.succeed(new URL(`https://openalex.org/S${encodeURIComponent(sourceId)}`)),
})

export type TopicId = string & Brand.Brand<'OpenAlexTopicId'>

export const TopicId = Brand.nominal<TopicId>()

export const TopicIdSchema = Schema.String.pipe(Schema.fromBrand(TopicId))

const TopicIdFromUrlSchema = Schema.transformOrFail(Url.UrlFromSelfSchema, TopicIdSchema, {
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/T')
      ? Either.right(decodeURIComponent(url.pathname.substring(2)))
      : Either.left(new ParseResult.Type(ast, url)),
  encode: topicId => ParseResult.succeed(new URL(`https://openalex.org/T${encodeURIComponent(topicId)}`)),
})

export type SubfieldId = string & Brand.Brand<'OpenAlexSubfieldId'>

export const SubfieldId = Brand.nominal<SubfieldId>()

export const SubfieldIdSchema = Schema.String.pipe(Schema.fromBrand(SubfieldId))

const SubfieldIdFromUrlSchema = Schema.transformOrFail(Url.UrlFromSelfSchema, SubfieldIdSchema, {
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/subfields/')
      ? Either.right(decodeURIComponent(url.pathname.substring(11)))
      : Either.left(new ParseResult.Type(ast, url)),
  encode: topicId => ParseResult.succeed(new URL(`https://openalex.org/subfields/${encodeURIComponent(topicId)}`)),
})

export type FieldId = string & Brand.Brand<'OpenAlexFieldId'>

export const FieldId = Brand.nominal<FieldId>()

export const FieldIdSchema = Schema.String.pipe(Schema.fromBrand(FieldId))

const FieldIdFromUrlSchema = Schema.transformOrFail(Url.UrlFromSelfSchema, FieldIdSchema, {
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/fields/')
      ? Either.right(decodeURIComponent(url.pathname.substring(8)))
      : Either.left(new ParseResult.Type(ast, url)),
  encode: topicId => ParseResult.succeed(new URL(`https://openalex.org/fields/${encodeURIComponent(topicId)}`)),
})

export type DomainId = string & Brand.Brand<'OpenAlexDomainId'>

export const DomainId = Brand.nominal<DomainId>()

export const DomainIdSchema = Schema.String.pipe(Schema.fromBrand(DomainId))

const DomainIdFromUrlSchema = Schema.transformOrFail(Url.UrlFromSelfSchema, DomainIdSchema, {
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/domains/')
      ? Either.right(decodeURIComponent(url.pathname.substring(9)))
      : Either.left(new ParseResult.Type(ast, url)),
  encode: topicId => ParseResult.succeed(new URL(`https://openalex.org/domains/${encodeURIComponent(topicId)}`)),
})

export const WorkSchema = Schema.Struct({
  doi: Doi.DoiFromUrlSchema,
  language: Schema.optionalWith(LanguageCode.LanguageCodeSchema, { nullable: true }),
  primary_location: Schema.Struct({
    source: Schema.optionalWith(Schema.Struct({ id: Schema.compose(Url.UrlFromStringSchema, SourceIdFromUrlSchema) }), {
      nullable: true,
    }),
  }),
  topics: Schema.Array(
    Schema.Struct({
      id: Schema.compose(Url.UrlFromStringSchema, TopicIdFromUrlSchema),
      subfield: Schema.Struct({
        id: Schema.compose(Url.UrlFromStringSchema, SubfieldIdFromUrlSchema),
      }),
      field: Schema.Struct({
        id: Schema.compose(Url.UrlFromStringSchema, FieldIdFromUrlSchema),
      }),
      domain: Schema.Struct({
        id: Schema.compose(Url.UrlFromStringSchema, DomainIdFromUrlSchema),
      }),
    }),
  ),
})

export const ListOfWorksSchema = Schema.Struct({
  results: Schema.Array(WorkSchema),
})
