import { Data, Effect, Match, ReadonlyArray, String, pipe } from 'effect'
import { decode } from 'html-entities'
import striptags from 'striptags'
import * as Crossref from './Crossref.js'
import type * as Doi from './Doi.js'

export interface Preprint {
  readonly authors: ReadonlyArray<string>
  readonly doi: Doi.Doi
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

    const title = yield* _(
      ReadonlyArray.head(work.title),
      Effect.mapError(() => new GetPreprintError({ message: 'No title found' })),
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
      authors,
      doi: work.DOI,
      title: decode(striptags(title)).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    })
  })
