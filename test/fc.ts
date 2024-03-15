import doiRegex from 'doi-regex'
import { ReadonlyArray } from 'effect'
import * as fc from 'fast-check'
import type { MockResponseObject } from 'fetch-mock'
import type * as Crossref from '../src/Crossref.js'
import type * as Doi from '../src/Doi.js'
import * as Temporal from '../src/Temporal.js'

export * from 'fast-check'

export const nonEmptyArray = <T>(
  arb: fc.Arbitrary<T>,
  constraints?: fc.ArrayConstraints,
): fc.Arbitrary<ReadonlyArray.NonEmptyArray<T>> =>
  fc.array(arb, { minLength: 1, ...constraints }).filter(ReadonlyArray.isNonEmptyArray)

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

export const plainYear = (): fc.Arbitrary<Temporal.PlainYear> =>
  fc.integer({ min: -271820, max: 275759 }).map(year => Temporal.PlainYear.from({ year }))

export const plainYearMonth = (): fc.Arbitrary<Temporal.PlainYearMonth> =>
  fc
    .record({
      year: fc.integer({ min: -271820, max: 275759 }),
      month: fc.integer({ min: 1, max: 12 }),
    })
    .map(args => Temporal.PlainYearMonth.from(args))

export const plainDate = (): fc.Arbitrary<Temporal.PlainDate> =>
  fc
    .record({
      year: fc.integer({ min: -271820, max: 275759 }),
      month: fc.integer({ min: 1, max: 12 }),
      day: fc.integer({ min: 1, max: 31 }),
    })
    .map(args => Temporal.PlainDate.from(args))

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

export const crossrefWork = (
  props: { [K in keyof Crossref.Work]?: fc.Arbitrary<Crossref.Work[K]> } = {},
): fc.Arbitrary<Crossref.Work> =>
  fc
    .record({
      author: fc.array(
        fc.oneof(
          fc.record(
            {
              family: fc.string(),
              given: fc.string(),
              prefix: fc.string(),
              suffix: fc.string(),
            },
            { requiredKeys: ['family'] },
          ),
          fc.record({ name: fc.string() }),
        ),
      ),
      DOI: doi(),
      institution: fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
      published: fc.option(fc.oneof(plainYear(), plainYearMonth(), plainDate()), { nil: undefined }),
      subtype: fc.option(fc.string(), { nil: undefined }),
      title: fc.array(fc.string()),
      type: fc.string(),
      ...props,
    })
    .map(work => {
      return Object.fromEntries(
        Object.entries(work).filter(
          ([key, value]) => !['institution', 'published', 'subtype'].includes(key) || value !== undefined,
        ),
      ) as never
    })
