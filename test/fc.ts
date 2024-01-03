import { Temporal } from '@js-temporal/polyfill'
import * as fc from 'fast-check'

export * from 'fast-check'

export const instant = (): fc.Arbitrary<Temporal.Instant> =>
  fc.date().map(date => Temporal.Instant.from(date.toISOString()))

export const epochMilliseconds = (): fc.Arbitrary<number> => instant().map(instant => instant.epochMilliseconds)
