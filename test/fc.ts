import { Temporal } from '@js-temporal/polyfill'
import doiRegex from 'doi-regex'
import * as fc from 'fast-check'
import type { MockResponseObject } from 'fetch-mock'
import type * as Doi from '../src/Doi.js'

export * from 'fast-check'

export const error = (): fc.Arbitrary<Error> => fc.string().map(error => new Error(error))

export const statusCode = (): fc.Arbitrary<number> => fc.integer({ min: 200, max: 599 })

export const fetchResponse = ({
  body,
  status,
}: {
  body?: fc.Arbitrary<MockResponseObject['body']>
  status?: fc.Arbitrary<MockResponseObject['status']>
} = {}): fc.Arbitrary<MockResponseObject> =>
  fc.record({
    body: body ?? fc.option(fc.string(), { nil: undefined }),
    status: status ?? fc.option(statusCode(), { nil: undefined }),
  }) as never

export const url = (): fc.Arbitrary<URL> => fc.webUrl().map(url => new URL(url))

export const instant = (): fc.Arbitrary<Temporal.Instant> =>
  fc.date().map(date => Temporal.Instant.from(date.toISOString()))

export const epochMilliseconds = (): fc.Arbitrary<number> => instant().map(instant => instant.epochMilliseconds)

export const doi = ({
  registrant,
  suffix,
}: { registrant?: fc.Arbitrary<string>; suffix?: fc.Arbitrary<string> } = {}): fc.Arbitrary<Doi.Doi> =>
  fc
    .tuple(registrant ?? doiRegistrant(), suffix ?? fc.unicodeString({ minLength: 1 }))
    .map(([prefix, suffix]) => `10.${prefix}/${suffix}` as Doi.Doi)
    .filter(s => doiRegex({ exact: true }).test(s) && !s.endsWith('/.') && !s.endsWith('/..'))

export const doiRegistrant = (): fc.Arbitrary<string> =>
  fc
    .tuple(
      fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 2 }),
      fc.array(fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 1 })),
    )
    .map(([one, two]) => [one, ...two].join('.'))
