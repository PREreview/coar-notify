import { Schema } from '@effect/schema'
import { test } from '@fast-check/vitest'
import { Effect, Equal } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { describe, expect } from 'vitest'
import * as Doi from '../../src/Doi.js'
import * as _ from '../../src/OpenAlex/OpenAlexApi.js'
import * as TestContext from '../TestContext.js'
import * as fc from '../fc.js'

describe('OpenAlexApiLive', () => {
  describe('getWork', () => {
    test.prop([
      fc.doi(),
      fc.openAlexWork().chain(work =>
        fc.tuple(
          fc.constant(work),
          fc.fetchResponse({
            status: fc.constant(StatusCodes.OK),
            body: fc.constant(Schema.encodeSync(_.WorkSchema)(work)),
          }),
        ),
      ),
    ])('when the response can be decoded', (id, [work, response]) =>
      Effect.gen(function* ($) {
        const fetchMock = yield* $(TestContext.FetchMock)
        const openAlexApi = yield* $(_.OpenAlexApi)

        fetchMock.getOnce(`https://api.openalex.org/works/${encodeURIComponent(Doi.toUrl(id).href)}`, response)

        const actual = yield* $(openAlexApi.getWork(id))

        expect(actual).toStrictEqual(work)
        expect(fetchMock.done()).toBeTruthy()
      }).pipe(
        Effect.provide(_.OpenAlexApiLive),
        Effect.provide(TestContext.TestHttpClient),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.doi(), fc.fetchResponse({ status: fc.constant(StatusCodes.OK) })])(
      "when the response can't be decoded",
      (id, response) =>
        Effect.gen(function* ($) {
          const fetchMock = yield* $(TestContext.FetchMock)
          const OpenAlexApi = yield* $(_.OpenAlexApi)

          fetchMock.getOnce(`https://api.openalex.org/works/${encodeURIComponent(Doi.toUrl(id).href)}`, response)

          const actual = yield* $(OpenAlexApi.getWork(id), Effect.flip)

          expect(actual).toBeInstanceOf(_.GetWorkError)
          expect(actual.message).toMatch(/^(?:Decode error|Expected )/)
          expect(fetchMock.done()).toBeTruthy()
        }).pipe(
          Effect.provide(_.OpenAlexApiLive),
          Effect.provide(TestContext.TestHttpClient),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )

    test.prop([
      fc.doi(),
      fc.fetchResponse({ status: fc.statusCode().filter(status => !Equal.equals(status, StatusCodes.OK)) }),
    ])('when the response has a non-200 status code', (id, response) =>
      Effect.gen(function* ($) {
        const fetchMock = yield* $(TestContext.FetchMock)
        const OpenAlexApi = yield* $(_.OpenAlexApi)

        fetchMock.getOnce(`https://api.openalex.org/works/${encodeURIComponent(Doi.toUrl(id).href)}`, response)

        const actual = yield* $(OpenAlexApi.getWork(id), Effect.flip)

        expect(actual).toBeInstanceOf(_.GetWorkError)
        expect(actual.message).toContain('StatusCode error')
        expect(fetchMock.done()).toBeTruthy()
      }).pipe(
        Effect.provide(_.OpenAlexApiLive),
        Effect.provide(TestContext.TestHttpClient),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.doi(), fc.error()])('when fetch throws an error', (id, error) =>
      Effect.gen(function* ($) {
        const fetchMock = yield* $(TestContext.FetchMock)
        const OpenAlexApi = yield* $(_.OpenAlexApi)

        fetchMock.getOnce(`https://api.openalex.org/works/${encodeURIComponent(Doi.toUrl(id).href)}`, { throws: error })

        const actual = yield* $(OpenAlexApi.getWork(id), Effect.flip)

        expect(actual).toBeInstanceOf(_.GetWorkError)
        expect(actual.message).toContain('Transport error')
        expect(fetchMock.done()).toBeTruthy()
      }).pipe(
        Effect.provide(_.OpenAlexApiLive),
        Effect.provide(TestContext.TestHttpClient),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )
  })

  describe('listWorks', () => {
    test.prop([
      fc.urlSearchParams(),
      fc.openAlexListOfWorks().chain(works =>
        fc.tuple(
          fc.constant(works),
          fc.fetchResponse({
            status: fc.constant(StatusCodes.OK),
            body: fc.constant(Schema.encodeSync(_.ListOfWorksSchema)(works)),
          }),
        ),
      ),
    ])('when the response can be decoded', (query, [works, response]) =>
      Effect.gen(function* ($) {
        const fetchMock = yield* $(TestContext.FetchMock)
        const openAlexApi = yield* $(_.OpenAlexApi)

        fetchMock.getOnce(
          { url: /^https:\/\/api\.openalex\.org\/works($|\?)/, query: Object.fromEntries(query.entries()) },
          response,
        )

        const actual = yield* $(openAlexApi.listWorks(query))

        expect(actual).toStrictEqual(works)
        expect(fetchMock.done()).toBeTruthy()
      }).pipe(
        Effect.provide(_.OpenAlexApiLive),
        Effect.provide(TestContext.TestHttpClient),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.urlSearchParams(), fc.fetchResponse({ status: fc.constant(StatusCodes.OK) })])(
      "when the response can't be decoded",
      (query, response) =>
        Effect.gen(function* ($) {
          const fetchMock = yield* $(TestContext.FetchMock)
          const OpenAlexApi = yield* $(_.OpenAlexApi)

          fetchMock.getOnce({ url: /^https:\/\/api\.openalex\.org\/works($|\?)/, query }, response)

          const actual = yield* $(OpenAlexApi.listWorks(query), Effect.flip)

          expect(actual).toBeInstanceOf(_.ListWorksError)
          expect(actual.message).toMatch(/^(?:Decode error|Expected )/)
          expect(fetchMock.done()).toBeTruthy()
        }).pipe(
          Effect.provide(_.OpenAlexApiLive),
          Effect.provide(TestContext.TestHttpClient),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )

    test.prop([
      fc.urlSearchParams(),
      fc.fetchResponse({ status: fc.statusCode().filter(status => !Equal.equals(status, StatusCodes.OK)) }),
    ])('when the response has a non-200 status code', (query, response) =>
      Effect.gen(function* ($) {
        const fetchMock = yield* $(TestContext.FetchMock)
        const OpenAlexApi = yield* $(_.OpenAlexApi)

        fetchMock.getOnce({ url: /^https:\/\/api\.openalex\.org\/works($|\?)/, query }, response)

        const actual = yield* $(OpenAlexApi.listWorks(query), Effect.flip)

        expect(actual).toBeInstanceOf(_.ListWorksError)
        expect(actual.message).toContain('StatusCode error')
        expect(fetchMock.done()).toBeTruthy()
      }).pipe(
        Effect.provide(_.OpenAlexApiLive),
        Effect.provide(TestContext.TestHttpClient),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.urlSearchParams(), fc.error()])('when fetch throws an error', (query, error) =>
      Effect.gen(function* ($) {
        const fetchMock = yield* $(TestContext.FetchMock)
        const OpenAlexApi = yield* $(_.OpenAlexApi)

        fetchMock.getOnce({ url: /^https:\/\/api\.openalex\.org\/works($|\?)/, query }, { throws: error })

        const actual = yield* $(OpenAlexApi.listWorks(query), Effect.flip)

        expect(actual).toBeInstanceOf(_.ListWorksError)
        expect(actual.message).toContain('Transport error')
        expect(fetchMock.done()).toBeTruthy()
      }).pipe(
        Effect.provide(_.OpenAlexApiLive),
        Effect.provide(TestContext.TestHttpClient),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )
  })
})
