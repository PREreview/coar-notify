import { HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { Context, Data, Effect, Equal, Layer, Match, type ParseResult, Schema, Tuple, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Doi from './Doi.js'
import * as Temporal from './Temporal.js'

export type Work = Schema.Schema.Type<typeof WorkSchema>

export class GetWorkError extends Data.TaggedError('GetWorkError')<{
  readonly cause?: HttpClientError.HttpClientError | ParseResult.ParseError
  readonly message: string
}> {}

export class CrossrefApi extends Context.Tag('CrossrefApi')<
  CrossrefApi,
  { readonly getWork: (doi: Doi.Doi) => Effect.Effect<Work, GetWorkError> }
>() {}

export const CrossrefApiLive = Layer.effect(
  CrossrefApi,
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const client = httpClient.pipe(
      HttpClient.mapRequest(HttpClientRequest.acceptJson),
      HttpClient.mapRequest(HttpClientRequest.prependUrl('https://api.crossref.org/')),
    )
    const okClient = HttpClient.filterStatus(client, status => Equal.equals(status, StatusCodes.OK))

    const getWork = (doi: Doi.Doi) =>
      Effect.gen(function* () {
        const response = yield* pipe(
          HttpClientRequest.get(`works/${encodeURIComponent(doi)}`),
          okClient.execute,
          Effect.flatMap(HttpClientResponse.schemaBodyJson(MessageSchema(WorkSchema))),
        )

        return response.message
      }).pipe(
        Effect.mapError(error =>
          Match.value(error).pipe(
            Match.tag('ParseError', error => new GetWorkError({ cause: error, message: error.message })),
            Match.tag(
              'RequestError',
              'ResponseError',
              error =>
                new GetWorkError({
                  cause: error,
                  message: error.reason,
                }),
            ),
            Match.exhaustive,
          ),
        ),
        Effect.scoped,
      )

    return { getWork }
  }),
)

const MessageSchema = <A, I, R>(messageSchema: Schema.Schema<A, I, R>) => Schema.Struct({ message: messageSchema })

const PartialDateSchema = Schema.Union(
  Temporal.PlainYearFromTupleSchema,
  Temporal.PlainYearMonthFromTupleSchema,
  Temporal.PlainDateFromTupleSchema,
)

const DateFromPartsSchema = Schema.transform(
  Schema.Struct({ 'date-parts': Schema.Tuple(Schema.encodedSchema(PartialDateSchema)) }),
  Schema.encodedSchema(PartialDateSchema),
  {
    decode: input => input['date-parts'][0],
    encode: parts => ({ 'date-parts': Tuple.make(parts) }),
  },
).pipe(Schema.compose(PartialDateSchema))

export const WorkSchema = Schema.Struct({
  abstract: Schema.optional(Schema.String),
  author: Schema.Array(
    Schema.Union(
      Schema.Struct({
        family: Schema.String,
        given: Schema.optional(Schema.String),
        prefix: Schema.optional(Schema.String),
        suffix: Schema.optional(Schema.String),
      }),
      Schema.Struct({
        name: Schema.String,
      }),
    ),
  ),
  DOI: Doi.DoiSchema,
  'group-title': Schema.optional(Schema.String),
  institution: Schema.optional(Schema.Array(Schema.Struct({ name: Schema.String }))),
  subtype: Schema.optional(Schema.String),
  published: Schema.optional(DateFromPartsSchema),
  title: Schema.Array(Schema.String),
  type: Schema.String,
})
