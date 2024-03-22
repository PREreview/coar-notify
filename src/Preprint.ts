import { Data, Effect, Either, Match, ReadonlyArray, String, pipe } from 'effect'
import * as Crossref from './Crossref.js'
import * as Doi from './Doi.js'
import * as Temporal from './Temporal.js'

export interface Preprint {
  readonly abstract: string
  readonly authors: ReadonlyArray<string>
  readonly doi: Doi.Doi
  readonly posted: Temporal.PlainDate
  readonly server: 'biorxiv' | 'scielo'
  readonly title: string
}

export const Preprint = Data.case<Preprint>()

export class GetPreprintError extends Data.TaggedError('GetPreprintError')<{
  readonly cause?: Error
  readonly message: string
}> {}

export const getPreprint = (doi: Doi.Doi): Effect.Effect<Preprint, GetPreprintError, Crossref.CrossrefApi> =>
  Effect.gen(function* (_) {
    const crossrefApi = yield* _(Crossref.CrossrefApi)
    const work = yield* _(
      crossrefApi.getWork(doi),
      Effect.mapError(
        error =>
          new GetPreprintError({
            cause: error,
            message: error.message,
          }),
      ),
    )

    if (work.type !== 'posted-content' || work.subtype !== 'preprint') {
      yield* _(Effect.fail(new GetPreprintError({ message: 'Not a preprint' })))
    }

    const server = yield* _(
      Match.value([Doi.getRegistrant(work.DOI), work]),
      Match.when(['1101', { institution: [{ name: 'bioRxiv' }] }], () => 'biorxiv' as const),
      Match.when(['1590'], () => 'scielo' as const),
      Match.either,
      Either.mapLeft(() => new GetPreprintError({ message: 'Not from a supported server' })),
    )

    const title = yield* _(
      ReadonlyArray.head(work.title),
      Effect.mapError(() => new GetPreprintError({ message: 'No title found' })),
    )

    const abstract = yield* _(
      Effect.fromNullable(work.abstract),
      Effect.mapError(() => new GetPreprintError({ message: 'No abstract found' })),
    )

    const posted = yield* _(
      Match.value(work.published),
      Match.when(Match.instanceOfUnsafe(Temporal.PlainDate), date => Either.right(date)),
      Match.when(Match.instanceOfUnsafe(Temporal.PlainYear), () =>
        Either.left(new GetPreprintError({ message: 'Published date incomplete' })),
      ),
      Match.when(Match.instanceOfUnsafe(Temporal.PlainYearMonth), () =>
        Either.left(new GetPreprintError({ message: 'Published date incomplete' })),
      ),
      Match.when(undefined, () => Either.left(new GetPreprintError({ message: 'No published date found' }))),
      Match.exhaustive,
    )

    const authors = ReadonlyArray.map(work.author, author =>
      Match.value(author).pipe(
        Match.when({ name: Match.string }, author => author.name),
        Match.when({ family: Match.string }, author =>
          pipe(
            ReadonlyArray.filter([author.prefix, author.given, author.family, author.suffix], String.isString),
            ReadonlyArray.join(' '),
          ),
        ),
        Match.exhaustive,
      ),
    )

    return Preprint({
      abstract,
      authors,
      doi: work.DOI,
      posted,
      server,
      title,
    })
  })
