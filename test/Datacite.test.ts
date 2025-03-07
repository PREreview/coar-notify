import { test } from '@fast-check/vitest'
import { Effect, Equal, Schema, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { describe, expect } from 'vitest'
import * as _ from '../src/Datacite.js'
import * as TestContext from './TestContext.js'
import * as fc from './fc.js'

describe('getWork', () => {
  test.prop([
    fc.doi(),
    fc.dataciteWork().chain(work =>
      fc.tuple(
        fc.constant(work),
        fc.fetchResponse({
          status: fc.constant(StatusCodes.OK),
          body: fc.constant({ data: { type: 'dois', attributes: Schema.encodeSync(_.WorkSchema)(work) } }),
        }),
      ),
    ),
  ])('when the response can be decoded', (doi, [work, response]) =>
    Effect.gen(function* () {
      const fetchMock = yield* TestContext.FetchMock
      const dataciteApi = yield* _.DataciteApi

      fetchMock.getOnce(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`, response)

      const actual = yield* dataciteApi.getWork(doi)

      expect(actual).toStrictEqual(work)
      expect(fetchMock.done()).toBeTruthy()
    }).pipe(
      Effect.provide(_.DataciteApiLive),
      Effect.provide(TestContext.TestHttpClient),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.doi(), fc.fetchResponse({ status: fc.constant(StatusCodes.OK) })])(
    "when the response can't be decoded",
    (doi, response) =>
      Effect.gen(function* () {
        const fetchMock = yield* TestContext.FetchMock
        const dataciteApi = yield* _.DataciteApi

        fetchMock.getOnce(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`, response)

        const actual = yield* pipe(dataciteApi.getWork(doi), Effect.flip)

        expect(actual).toBeInstanceOf(_.GetWorkError)
        expect(actual.message).toMatch(/^(?:Decode$|Expected |{)/)
        expect(fetchMock.done()).toBeTruthy()
      }).pipe(
        Effect.provide(_.DataciteApiLive),
        Effect.provide(TestContext.TestHttpClient),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([
    fc.doi(),
    fc.fetchResponse({ status: fc.statusCode().filter(status => !Equal.equals(status, StatusCodes.OK)) }),
  ])('when the response has a non-200 status code', (doi, response) =>
    Effect.gen(function* () {
      const fetchMock = yield* TestContext.FetchMock
      const dataciteApi = yield* _.DataciteApi

      fetchMock.getOnce(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`, response)

      const actual = yield* pipe(dataciteApi.getWork(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetWorkError)
      expect(actual.message).toStrictEqual('StatusCode')
      expect(fetchMock.done()).toBeTruthy()
    }).pipe(
      Effect.provide(_.DataciteApiLive),
      Effect.provide(TestContext.TestHttpClient),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.doi(), fc.error()])('when fetch throws an error', (doi, error) =>
    Effect.gen(function* () {
      const fetchMock = yield* TestContext.FetchMock
      const dataciteApi = yield* _.DataciteApi

      fetchMock.getOnce(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`, { throws: error })

      const actual = yield* pipe(dataciteApi.getWork(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetWorkError)
      expect(actual.message).toStrictEqual('Transport')
      expect(fetchMock.done()).toBeTruthy()
    }).pipe(
      Effect.provide(_.DataciteApiLive),
      Effect.provide(TestContext.TestHttpClient),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
