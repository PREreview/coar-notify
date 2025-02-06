import { Array, Data, Effect, Either, Match, Schema, String, pipe } from 'effect'
import * as Crossref from './Crossref.js'
import * as Doi from './Doi.js'
import * as Temporal from './Temporal.js'

export interface CrossrefPreprint {
  readonly abstract: string
  readonly authors: ReadonlyArray<string>
  readonly doi: Doi.Doi
  readonly posted: Temporal.PlainDate
  readonly server:
    | 'biorxiv'
    | 'eartharxiv'
    | 'ecoevorxiv'
    | 'edarxiv'
    | 'medrxiv'
    | 'metaarxiv'
    | 'osf-preprints'
    | 'preprints.org'
    | 'psyarxiv'
    | 'scielo'
    | 'socarxiv'
  readonly title: string
}

export const CrossrefPreprint = Data.case<CrossrefPreprint>()

export const CrossrefPreprintServerSchema = Schema.Literal(
  'biorxiv',
  'eartharxiv',
  'ecoevorxiv',
  'edarxiv',
  'medrxiv',
  'metaarxiv',
  'osf-preprints',
  'preprints.org',
  'psyarxiv',
  'scielo',
  'socarxiv',
)

export class GetPreprintFromCrossrefError extends Data.TaggedError('GetPreprintFromCrossrefError')<{
  readonly cause?: Error
  readonly message: string
}> {}

export const getPreprintFromCrossref = (
  doi: Doi.Doi,
): Effect.Effect<CrossrefPreprint, GetPreprintFromCrossrefError, Crossref.CrossrefApi> =>
  Effect.gen(function* () {
    const crossrefApi = yield* Crossref.CrossrefApi
    const work = yield* pipe(
      crossrefApi.getWork(doi),
      Effect.mapError(
        error =>
          new GetPreprintFromCrossrefError({
            cause: error,
            message: error.message,
          }),
      ),
    )

    if (work.type !== 'posted-content' || work.subtype !== 'preprint') {
      yield* Effect.fail(new GetPreprintFromCrossrefError({ message: 'Not a preprint' }))
    }

    const server = yield* pipe(
      Match.value([Doi.getRegistrant(work.DOI), work]),
      Match.when(['1101', { institution: [{ name: 'bioRxiv' }] }], () => 'biorxiv' as const),
      Match.when(['1101', { institution: [{ name: 'medRxiv' }] }], () => 'medrxiv' as const),
      Match.when(['1590'], () => 'scielo' as const),
      Match.when(['20944'], () => 'preprints.org' as const),
      Match.when(['31219', { 'group-title': 'Open Science Framework' }], () => 'osf-preprints' as const),
      Match.when(['31222'], () => 'metaarxiv' as const),
      Match.when(['31223'], () => 'eartharxiv' as const),
      Match.when(['31234', { 'group-title': 'PsyArXiv' }], () => 'psyarxiv' as const),
      Match.when(['31235', { 'group-title': 'SocArXiv' }], () => 'socarxiv' as const),
      Match.when(['32942'], () => 'ecoevorxiv' as const),
      Match.when(['35542', { 'group-title': 'EdArXiv' }], () => 'edarxiv' as const),
      Match.either,
      Either.mapLeft(() => new GetPreprintFromCrossrefError({ message: 'Not from a supported server' })),
    )

    const title = yield* pipe(
      Array.head(work.title),
      Effect.mapError(() => new GetPreprintFromCrossrefError({ message: 'No title found' })),
    )

    const abstract = yield* pipe(
      Effect.fromNullable(work.abstract),
      Effect.mapError(() => new GetPreprintFromCrossrefError({ message: 'No abstract found' })),
    )

    const posted = yield* pipe(
      Match.value(work.published),
      Match.when(Match.instanceOfUnsafe(Temporal.PlainDate), date => Either.right(date)),
      Match.when(Match.instanceOfUnsafe(Temporal.PlainYear), () =>
        Either.left(new GetPreprintFromCrossrefError({ message: 'Published date incomplete' })),
      ),
      Match.when(Match.instanceOfUnsafe(Temporal.PlainYearMonth), () =>
        Either.left(new GetPreprintFromCrossrefError({ message: 'Published date incomplete' })),
      ),
      Match.when(undefined, () =>
        Either.left(new GetPreprintFromCrossrefError({ message: 'No published date found' })),
      ),
      Match.exhaustive,
    )

    const authors = Array.map(work.author, author =>
      Match.value(author).pipe(
        Match.when({ name: Match.string }, author => author.name),
        Match.when({ family: Match.string }, author =>
          pipe(
            Array.filter([author.prefix, author.given, author.family, author.suffix], String.isString),
            Array.join(' '),
          ),
        ),
        Match.exhaustive,
      ),
    )

    return CrossrefPreprint({
      abstract,
      authors,
      doi: work.DOI,
      posted,
      server,
      title,
    })
  })
