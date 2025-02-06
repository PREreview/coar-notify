import { test } from '@fast-check/vitest'
import { Array, Effect, Option, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { describe, expect, vi } from 'vitest'
import * as _ from '../../src/OpenAlex/GetWork.js'
import { OpenAlexApi } from '../../src/OpenAlex/index.js'
import * as TestContext from '../TestContext.js'
import * as fc from './fc.js'

describe('getWork', () => {
  test.prop([fc.openAlexWork()])('when the work is found', async work => {
    const getWork = vi.fn(() => Effect.succeed(work))

    await Effect.gen(function* () {
      const actual = yield* _.getWork(work.doi)

      expect(actual).toStrictEqual(Option.some(work))
    }).pipe(
      Effect.provideService(OpenAlexApi, { getWork, listWorks: () => Effect.die('should not be called') }),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    )

    expect(getWork).toHaveBeenNthCalledWith(1, work.doi)
  })

  test.prop([
    fc.openAlexListOfWorks({
      results: fc.nonEmptyArray(fc.openAlexWork(), { minLength: 2, maxLength: 50 }),
    }),
  ])('when many works are found', async works => {
    const listWorks = vi.fn(() => Effect.succeed(works))

    await Effect.gen(function* () {
      const dois = Array.map(works.results, work => work.doi)

      const actual = yield* Effect.forEach(dois, _.getWork, { batching: true })

      expect(actual).toStrictEqual(Array.map(works.results, Option.some))
    }).pipe(
      Effect.provideService(OpenAlexApi, { getWork: () => Effect.die('should not be called'), listWorks }),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    )

    expect(listWorks).toHaveBeenCalledTimes(1)
  })

  test.prop([
    fc.doi(),
    fc.openAlexGetWorkError({
      cause: fc.httpClientStatusCodeResponseError({ status: fc.constant(StatusCodes.NOT_FOUND) }),
    }),
  ])("when the work isn't found", (doi, error) =>
    Effect.gen(function* () {
      const actual = yield* _.getWork(doi)

      expect(actual).toStrictEqual(Option.none())
    }).pipe(
      Effect.provideService(OpenAlexApi, {
        getWork: () => Effect.fail(error),
        listWorks: () => Effect.die('should not be called'),
      }),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.nonEmptyArray(fc.doi(), { minLength: 2, maxLength: 50 }), fc.openAlexListOfWorks()])(
    "when a work isn't found",
    (dois, works) =>
      Effect.gen(function* () {
        const actual = yield* Effect.forEach(dois, _.getWork, { batching: true })

        expect(actual).toStrictEqual(Array.map(dois, () => Option.none()))
      }).pipe(
        Effect.provideService(OpenAlexApi, {
          getWork: () => Effect.die('should not be called'),
          listWorks: () => Effect.succeed(works),
        }),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.doi(), fc.openAlexGetWorkError()])("when the work can't be loaded", (doi, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.getWork(doi), Effect.flip)

      expect(actual).toStrictEqual(error)
    }).pipe(
      Effect.provideService(OpenAlexApi, {
        getWork: () => Effect.fail(error),
        listWorks: () => Effect.die('should not be called'),
      }),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.nonEmptyArray(fc.doi(), { minLength: 2, maxLength: 50 }), fc.openAlexListWorksError()])(
    "when works can't be loaded",
    (dois, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(Effect.forEach(dois, _.getWork, { batching: true }), Effect.flip)

        expect(actual).toStrictEqual(error)
      }).pipe(
        Effect.provideService(OpenAlexApi, {
          getWork: () => Effect.die('should not be called'),
          listWorks: () => Effect.fail(error),
        }),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )
})
