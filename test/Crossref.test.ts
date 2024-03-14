import { test } from '@fast-check/vitest'
import { Effect, Equal } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { describe, expect } from 'vitest'
import * as _ from '../src/Crossref.js'
import * as TestContext from './TestContext.js'
import * as fc from './fc.js'

describe('getWork', () => {
  test.prop([
    fc.doi(),
    fc
      .record(
        {
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
          DOI: fc.doi(),
          subtype: fc.string(),
          title: fc.array(fc.string()),
          type: fc.string(),
        },
        { requiredKeys: ['author', 'DOI', 'title', 'type'] },
      )
      .chain(work =>
        fc.tuple(
          fc.constant(work),
          fc.fetchResponse({
            status: fc.constant(StatusCodes.OK),
            body: fc.constant({ message: work }),
          }),
        ),
      ),
  ])('when the response can be decoded', (doi, [work, response]) =>
    Effect.gen(function* ($) {
      const fetchMock = yield* $(TestContext.FetchMock)
      const crossrefApi = yield* $(_.CrossrefApi)

      fetchMock.getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, response)

      const actual = yield* $(crossrefApi.getWork(doi))

      expect(actual).toStrictEqual(work)
      expect(fetchMock.done()).toBeTruthy()
    }).pipe(
      Effect.provide(_.CrossrefApiLive),
      Effect.provide(TestContext.TestHttpClient),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.doi(), fc.fetchResponse({ status: fc.constant(StatusCodes.OK) })])(
    "when the response can't be decoded",
    (doi, response) =>
      Effect.gen(function* ($) {
        const fetchMock = yield* $(TestContext.FetchMock)
        const crossrefApi = yield* $(_.CrossrefApi)

        fetchMock.getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, response)

        const actual = yield* $(crossrefApi.getWork(doi), Effect.flip)

        expect(actual).toBeInstanceOf(_.GetWorkError)
        expect(actual.message).toMatch(/^(?:Decode$|Expected )/)
        expect(fetchMock.done()).toBeTruthy()
      }).pipe(
        Effect.provide(_.CrossrefApiLive),
        Effect.provide(TestContext.TestHttpClient),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([
    fc.doi(),
    fc.fetchResponse({ status: fc.statusCode().filter(status => !Equal.equals(status, StatusCodes.OK)) }),
  ])('when the response has a non-200 status code', (doi, response) =>
    Effect.gen(function* ($) {
      const fetchMock = yield* $(TestContext.FetchMock)
      const crossrefApi = yield* $(_.CrossrefApi)

      fetchMock.getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, response)

      const actual = yield* $(crossrefApi.getWork(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetWorkError)
      expect(actual.message).toStrictEqual('StatusCode')
      expect(fetchMock.done()).toBeTruthy()
    }).pipe(
      Effect.provide(_.CrossrefApiLive),
      Effect.provide(TestContext.TestHttpClient),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.doi(), fc.error()])('when fetch through an error', (doi, error) =>
    Effect.gen(function* ($) {
      const fetchMock = yield* $(TestContext.FetchMock)
      const crossrefApi = yield* $(_.CrossrefApi)

      fetchMock.getOnce(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { throws: error })

      const actual = yield* $(crossrefApi.getWork(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetWorkError)
      expect(actual.message).toStrictEqual('Transport')
      expect(fetchMock.done()).toBeTruthy()
    }).pipe(
      Effect.provide(_.CrossrefApiLive),
      Effect.provide(TestContext.TestHttpClient),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
