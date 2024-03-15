import { HttpClient } from '@effect/platform'
import { type ParseResult, Schema } from '@effect/schema'
import { Context, Data, Effect, Equal, Layer, Match } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Doi from './Doi.js'

export type Work = Schema.Schema.To<typeof WorkSchema>

export class GetWorkError extends Data.TaggedError('GetWorkError')<{
  readonly cause?: HttpClient.error.HttpClientError | ParseResult.ParseError
  readonly message: string
}> {}

export class CrossrefApi extends Context.Tag('CrossrefApi')<
  CrossrefApi,
  { readonly getWork: (doi: Doi.Doi) => Effect.Effect<Work, GetWorkError> }
>() {}

export const CrossrefApiLive = Layer.effect(
  CrossrefApi,
  Effect.gen(function* (_) {
    const httpClient = yield* _(HttpClient.client.Client)
    const client = httpClient.pipe(
      HttpClient.client.mapRequest(HttpClient.request.acceptJson),
      HttpClient.client.mapRequest(HttpClient.request.prependUrl('https://api.crossref.org/')),
    )
    const okClient = HttpClient.client.filterStatus(client, status => Equal.equals(status, StatusCodes.OK))

    const getWork = (doi: Doi.Doi) =>
      Effect.gen(function* (_) {
        const response = yield* _(
          HttpClient.request.get(`works/${encodeURIComponent(doi)}`),
          okClient,
          Effect.flatMap(HttpClient.response.schemaBodyJson(MessageSchema(WorkSchema))),
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

const MessageSchema = <A, I, R>(messageSchema: Schema.Schema<A, I, R>) => Schema.struct({ message: messageSchema })

export const WorkSchema = Schema.struct({
  author: Schema.array(
    Schema.union(
      Schema.struct({
        family: Schema.string,
        given: Schema.optional(Schema.string),
        prefix: Schema.optional(Schema.string),
        suffix: Schema.optional(Schema.string),
      }),
      Schema.struct({
        name: Schema.string,
      }),
    ),
  ),
  DOI: Doi.DoiSchema,
  institution: Schema.optional(Schema.array(Schema.struct({ name: Schema.string }))),
  subtype: Schema.optional(Schema.string),
  title: Schema.array(Schema.string),
  type: Schema.string,
})
