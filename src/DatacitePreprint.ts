import { Array, Data, Effect, Either, Function, Match, Option, Predicate, Schema, String, pipe } from 'effect'
import * as Datacite from './Datacite.js'
import * as Doi from './Doi.js'
import * as Temporal from './Temporal.js'

export interface DatacitePreprint {
  readonly abstract?: string | undefined
  readonly authors: ReadonlyArray<string>
  readonly doi: Doi.Doi
  readonly posted: Temporal.PlainDate | Temporal.PlainYearMonth
  readonly server: 'africarxiv' | 'arxiv' | 'osf' | 'zenodo'
  readonly title: string
}

export const DatacitePreprint = Data.case<DatacitePreprint>()

export const DatacitePreprintServerSchema = Schema.Literal('africarxiv', 'arxiv', 'osf', 'zenodo')

export class GetPreprintFromDataciteError extends Data.TaggedError('GetPreprintFromDataciteError')<{
  readonly cause?: Error
  readonly message: string
}> {}

export const getPreprintFromDatacite = (
  doi: Doi.Doi,
): Effect.Effect<DatacitePreprint, GetPreprintFromDataciteError, Datacite.DataciteApi> =>
  Effect.gen(function* () {
    const dataciteApi = yield* Datacite.DataciteApi
    const work = yield* pipe(
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
      yield* Effect.fail(new GetPreprintFromDataciteError({ message: 'Not a preprint' }))
    }

    const server = yield* pipe(
      Match.value([Doi.getRegistrant(work.doi), work]),
      Match.when(['5281'], () => 'zenodo' as const),
      Match.when(['17605'], () => 'osf' as const),
      Match.when(['48550'], () => 'arxiv' as const),
      Match.when(['60763'], () => 'africarxiv' as const),
      Match.either,
      Either.mapLeft(() => new GetPreprintFromDataciteError({ message: 'Not from a supported server' })),
    )

    const title = Array.headNonEmpty(work.titles).title

    const abstract = pipe(
      Array.findFirst(work.descriptions, ({ descriptionType }) => descriptionType.toLowerCase() === 'abstract'),
      Option.match({ onSome: ({ description }) => description, onNone: Function.constUndefined }),
    )

    const posted = yield* pipe(
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
