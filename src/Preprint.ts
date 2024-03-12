import { Data, Effect } from 'effect'
import * as Crossref from './Crossref.js'
import type * as Doi from './Doi.js'

export interface Preprint {
  readonly doi: Doi.Doi
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

    return Preprint({
      doi: work.DOI,
    })
  })
