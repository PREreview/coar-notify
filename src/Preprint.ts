import { Data, Effect, Match, Schema, flow } from 'effect'
import type * as Crossref from './Crossref.js'
import * as CrossrefPreprint from './CrossrefPreprint.js'
import type * as Datacite from './Datacite.js'
import * as DatacitePreprint from './DatacitePreprint.js'
import * as Doi from './Doi.js'

export type Preprint = CrossrefPreprint.CrossrefPreprint | DatacitePreprint.DatacitePreprint

export const PreprintServerSchema = Schema.Union(
  CrossrefPreprint.CrossrefPreprintServerSchema,
  DatacitePreprint.DatacitePreprintServerSchema,
)

export class GetPreprintError extends Data.TaggedError('GetPreprintError')<{
  readonly cause?: Error
  readonly message: string
}> {}

export const getPreprint: (
  doi: Doi.Doi,
) => Effect.Effect<Preprint, GetPreprintError, Crossref.CrossrefApi | Datacite.DataciteApi> = flow(
  Match.value,
  Match.when(
    Doi.hasRegistrant(
      '1101',
      '1590',
      '20944',
      '21203',
      '26434',
      '31124',
      '31219',
      '31222',
      '31223',
      '31224',
      '31234',
      '31235',
      '32942',
      '35542',
      '36227',
    ),
    CrossrefPreprint.getPreprintFromCrossref,
  ),
  Match.when(Doi.hasRegistrant('5281', '48550', '60763'), DatacitePreprint.getPreprintFromDatacite),
  Match.orElse(() => Effect.fail('Not from a supported server')),
  Effect.mapError(toGetPreprintError),
)

function toGetPreprintError(error: unknown): GetPreprintError {
  return new GetPreprintError(
    error instanceof Error ? { cause: error, message: error.message } : { message: String(error) },
  )
}
