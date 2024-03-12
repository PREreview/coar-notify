import { Data, Effect, ReadonlyArray } from 'effect'
import { decode } from 'html-entities'
import striptags from 'striptags'
import * as Crossref from './Crossref.js'
import type * as Doi from './Doi.js'

export interface Preprint {
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

    const title = yield* _(
      ReadonlyArray.head(work.title),
      Effect.mapError(() => new GetPreprintError({ message: 'No title found' })),
    )

    return Preprint({
      doi: work.DOI,
      title: decode(striptags(title)).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    })
  })
