import { Array, Data, Effect, Either, Match, Predicate, Schema, String, pipe } from 'effect'
import * as Datacite from './Datacite.js'
import * as Doi from './Doi.js'
import * as Temporal from './Temporal.js'

export interface DatacitePreprint {
  readonly abstract: string
  readonly authors: ReadonlyArray<string>
  readonly doi: Doi.Doi
  readonly posted: Temporal.PlainDate | Temporal.PlainYearMonth
  readonly server: 'africarxiv' | 'arxiv'
  readonly title: string
}

export const DatacitePreprint = Data.case<DatacitePreprint>()

export const DatacitePreprintServerSchema = Schema.Literal('arxiv')

export class GetPreprintFromDataciteError extends Data.TaggedError('GetPreprintFromDataciteError')<{
  readonly cause?: Error
  readonly message: string
}> {}

export const getPreprintFromDatacite = (
  doi: Doi.Doi,
): Effect.Effect<DatacitePreprint, GetPreprintFromDataciteError, Datacite.DataciteApi> =>
  Effect.gen(function* (_) {
    const dataciteApi = yield* _(Datacite.DataciteApi)
    const work = yield* _(
      dataciteApi.getWork(doi),
      Effect.mapError(
        error =>
          new GetPreprintFromDataciteError({
            cause: error,
            message: error.message,
          }),
      ),
    )

    if (
      pipe(
        work,
        Predicate.not(
          Predicate.some([
            work => work.types.resourceType?.toLowerCase() === 'preprint',
            work => work.types.resourceTypeGeneral?.toLowerCase() === 'preprint',
            work =>
              work.types.resourceTypeGeneral?.toLowerCase() === 'text' && Doi.hasRegistrant('48550', '60763')(work.doi),
            work => work.types.resourceTypeGeneral === undefined && Doi.hasRegistrant('60763')(work.doi),
          ]),
        ),
      )
    ) {
      yield* _(Effect.fail(new GetPreprintFromDataciteError({ message: 'Not a preprint' })))
    }

    const server = yield* _(
      Match.value([Doi.getRegistrant(work.doi), work]),
      Match.when(['48550'], () => 'arxiv' as const),
      Match.when(['60763'], () => 'africarxiv' as const),
      Match.either,
      Either.mapLeft(() => new GetPreprintFromDataciteError({ message: 'Not from a supported server' })),
    )

    const title = Array.headNonEmpty(work.titles).title

    const abstract = yield* _(
      Array.findFirst(work.descriptions, ({ descriptionType }) => descriptionType.toLowerCase() === 'abstract'),
      Effect.mapBoth({
        onFailure: () => new GetPreprintFromDataciteError({ message: 'No abstract found' }),
        onSuccess: ({ description }) => description,
      }),
    )

    const posted = yield* _(
      Array.findFirst(work.dates, ({ dateType }) => dateType.toLowerCase() === 'submitted'),
      Effect.orElse(() => Array.findFirst(work.dates, ({ dateType }) => dateType.toLowerCase() === 'created')),
      Effect.orElse(() => Array.findFirst(work.dates, ({ dateType }) => dateType.toLowerCase() === 'issued')),
      Effect.mapError(() => new GetPreprintFromDataciteError({ message: 'No published date found' })),
      Effect.flatMap(({ date }) =>
        Match.value(date).pipe(
          Match.when(Match.instanceOfUnsafe(Temporal.Instant), instant =>
            Either.right(instant.toZonedDateTimeISO('UTC').toPlainDate()),
          ),
          Match.when(Match.instanceOfUnsafe(Temporal.PlainDate), date => Either.right(date)),
          Match.when(Match.instanceOfUnsafe(Temporal.PlainYear), () =>
            Either.left(new GetPreprintFromDataciteError({ message: 'Published date incomplete' })),
          ),
          Match.when(Match.instanceOfUnsafe(Temporal.PlainYearMonth), date => Either.right(date)),
          Match.exhaustive,
        ),
      ),
    )

    const authors = Array.map(work.creators, creator =>
      Match.value(creator).pipe(
        Match.when({ name: Match.string }, creator => creator.name),
        Match.when({ familyName: Match.string }, creator =>
          pipe(Array.filter([creator.givenName, creator.familyName], String.isString), Array.join(' ')),
        ),
        Match.exhaustive,
      ),
    )

    return DatacitePreprint({
      abstract,
      authors,
      doi: work.doi,
      posted,
      server,
      title,
    })
  })
