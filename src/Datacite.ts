import { HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { type ParseResult, Schema } from '@effect/schema'
import { Context, Data, Effect, Equal, Layer, Match } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Doi from './Doi.js'
import * as Temporal from './Temporal.js'

export type Work = Schema.Schema.Type<typeof WorkSchema>

export class GetWorkError extends Data.TaggedError('GetWorkError')<{
  readonly cause?: HttpClientError.HttpClientError | ParseResult.ParseError
  readonly message: string
}> {}

export class DataciteApi extends Context.Tag('DataciteApi')<
  DataciteApi,
  { readonly getWork: (doi: Doi.Doi) => Effect.Effect<Work, GetWorkError> }
>() {}

export const DataciteApiLive = Layer.effect(
  DataciteApi,
  Effect.gen(function* (_) {
    const httpClient = yield* _(HttpClient.HttpClient)
    const client = httpClient.pipe(
      HttpClient.mapRequest(HttpClientRequest.acceptJson),
      HttpClient.mapRequest(HttpClientRequest.prependUrl('https://api.datacite.org/')),
    )
    const okClient = HttpClient.filterStatus(client, status => Equal.equals(status, StatusCodes.OK))

    const getWork = (doi: Doi.Doi) =>
      Effect.gen(function* (_) {
        const response = yield* _(
          HttpClientRequest.get(`dois/${encodeURIComponent(doi)}`),
          okClient,
          Effect.flatMap(HttpClientResponse.schemaBodyJson(DataSchema('dois', WorkSchema))),
        )

        return response.data.attributes
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

const DataSchema = <T extends string, A, I, R>(type: T, attributesSchema: Schema.Schema<A, I, R>) =>
  Schema.Struct({
    data: Schema.Struct({
      type: Schema.Literal(type),
      attributes: attributesSchema,
    }),
  })

const PartialDateSchema = Schema.Union(
  Temporal.InstantFromStringSchema,
  Temporal.PlainDateFromStringSchema,
  Temporal.PlainYearMonthFromStringSchema,
  Temporal.PlainYearFromStringSchema,
)

export const WorkSchema = Schema.Struct({
  creators: Schema.Array(
    Schema.Union(
      Schema.Struct({
        familyName: Schema.String,
        givenName: Schema.optional(Schema.String),
      }),
      Schema.Struct({
        name: Schema.String,
      }),
    ),
  ),
  descriptions: Schema.Array(Schema.Struct({ description: Schema.String, descriptionType: Schema.String })),
  doi: Doi.DoiSchema,
  dates: Schema.NonEmptyArray(
    Schema.Struct({
      date: PartialDateSchema,
      dateType: Schema.String,
    }),
  ),
  titles: Schema.NonEmptyArray(Schema.Struct({ title: Schema.String })),
  types: Schema.Struct({
    resourceType: Schema.optional(Schema.String),
    resourceTypeGeneral: Schema.optional(Schema.String),
  }),
})
