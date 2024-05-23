import { HttpClient } from '@effect/platform'
import doiRegex from 'doi-regex'
import { Array, String } from 'effect'
import * as fc from 'fast-check'
import type { MockResponseObject } from 'fetch-mock'
import type * as Crossref from '../src/Crossref.js'
import type * as Datacite from '../src/Datacite.js'
import type * as Doi from '../src/Doi.js'
import * as OpenAlex from '../src/OpenAlex/index.js'
import * as Temporal from '../src/Temporal.js'

export * from 'fast-check'

export const alphanumeric = (): fc.Arbitrary<string> => fc.stringMatching(/^[A-z0-9]$/)

export const trimmedString = (constraints?: fc.StringSharedConstraints): fc.Arbitrary<string> =>
  fc.string(constraints).map(String.trim).filter(String.isNonEmpty)

export const untrimmedString = (constraints?: fc.StringSharedConstraints): fc.Arbitrary<string> =>
  fc.string(constraints).filter(string => string.trim() === string)

export const nonEmptyArray = <T>(
  arb: fc.Arbitrary<T>,
  constraints?: fc.ArrayConstraints,
): fc.Arbitrary<Array.NonEmptyArray<T>> => fc.array(arb, { minLength: 1, ...constraints }).filter(Array.isNonEmptyArray)

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

export const urlSearchParams = (): fc.Arbitrary<URLSearchParams> =>
  fc.webQueryParameters().map(query => new URLSearchParams(query))

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

export const httpMethod = (): fc.Arbitrary<NonNullable<HttpClient.request.Options['method']>> =>
  fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS')

export const httpClientRequest = (): fc.Arbitrary<HttpClient.request.ClientRequest> =>
  fc
    .record({
      method: httpMethod(),
      url: url(),
    })
    .map(({ method, url, ...options }) => HttpClient.request.make(method)(url, options))

export const httpClientResponse = ({
  status,
}: { status?: fc.Arbitrary<number> | undefined } = {}): fc.Arbitrary<HttpClient.response.ClientResponse> =>
  fc
    .record({
      request: httpClientRequest(),
      response: fc.record({ body: fc.option(fc.string()), status: status ?? statusCode() }),
    })
    .map(({ request, response }) => HttpClient.response.fromWeb(request, new Response(response.body, response)))

export const httpClientStatusCodeResponseError = ({
  status,
}: { status?: fc.Arbitrary<number> } = {}): fc.Arbitrary<HttpClient.error.ResponseError> =>
  fc
    .record({
      request: httpClientRequest(),
      response: httpClientResponse({ status }),
      reason: fc.constant('StatusCode' as const),
      error: fc.anything(),
    })
    .map(args =>
      Object.defineProperties(new HttpClient.error.ResponseError(args), {
        [fc.toStringMethod]: { value: () => fc.stringify(args) },
      }),
    )

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
      abstract: fc.option(fc.string(), { nil: undefined }),
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
      'group-title': fc.option(fc.string(), { nil: undefined }),
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
          ([key, value]) =>
            !['abstract', 'group-title', 'institution', 'published', 'subtype'].includes(key) || value !== undefined,
        ),
      ) as never
    })

export const dataciteWork = (
  props: { [K in keyof Datacite.Work]?: fc.Arbitrary<Datacite.Work[K]> } = {},
): fc.Arbitrary<Datacite.Work> =>
  fc.record({
    creators: fc.array(
      fc.oneof(
        fc.record(
          {
            familyName: fc.string(),
            givenName: fc.string(),
          },
          { requiredKeys: ['familyName'] },
        ),
        fc.record({ name: fc.string() }),
      ),
    ),
    descriptions: fc.array(fc.record({ description: fc.string(), descriptionType: fc.string() })),
    doi: doi(),
    dates: nonEmptyArray(
      fc.record({
        date: fc.oneof(instant(), plainYear(), plainYearMonth(), plainDate()),
        dateType: fc.string(),
      }),
    ),
    titles: nonEmptyArray(fc.record({ title: fc.string() })),
    types: fc.record({ resourceType: fc.string(), resourceTypeGeneral: fc.string() }, { withDeletedKeys: true }),
    ...props,
  })

export const openAlexFieldId = (): fc.Arbitrary<OpenAlex.FieldId> =>
  fc.stringOf(alphanumeric(), { minLength: 1 }).map(OpenAlex.FieldId)

export const openAlexWork = (): fc.Arbitrary<OpenAlex.Work> =>
  fc.record({
    doi: doi(),
    topics: fc.array(fc.record({ field: fc.record({ id: openAlexFieldId() }) })),
  })

export const openAlexListOfWorks = ({
  results,
}: { results?: fc.Arbitrary<OpenAlex.ListOfWorks['results']> } = {}): fc.Arbitrary<OpenAlex.ListOfWorks> =>
  fc.record({
    results: results ?? fc.array(openAlexWork()),
  })
