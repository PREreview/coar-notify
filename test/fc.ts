import { Temporal } from '@js-temporal/polyfill'
import doiRegex from 'doi-regex'
import * as fc from 'fast-check'
import type * as Doi from '../src/Doi.js'

export * from 'fast-check'

export const instant = (): fc.Arbitrary<Temporal.Instant> =>
  fc.date().map(date => Temporal.Instant.from(date.toISOString()))

export const epochMilliseconds = (): fc.Arbitrary<number> => instant().map(instant => instant.epochMilliseconds)

export const doi = (): fc.Arbitrary<Doi.Doi> =>
  fc
    .tuple(doiRegistrant(), fc.unicodeString({ minLength: 1 }))
    .map(([prefix, suffix]) => `10.${prefix}/${suffix}` as Doi.Doi)
    .filter(s => doiRegex({ exact: true }).test(s) && !s.endsWith('/.') && !s.endsWith('/..'))

const doiRegistrant = (): fc.Arbitrary<string> =>
  fc
    .tuple(
      fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 2 }),
      fc.array(fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 1 })),
    )
    .map(([one, two]) => [one, ...two].join('.'))
