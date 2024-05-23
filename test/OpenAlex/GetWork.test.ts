import { test } from '@fast-check/vitest'
import { Effect, Option } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { describe, expect, vi } from 'vitest'
import * as _ from '../../src/OpenAlex/GetWork.js'
import { OpenAlexApi } from '../../src/OpenAlex/index.js'
import * as TestContext from '../TestContext.js'
import * as fc from './fc.js'

describe('getWork', () => {
  test.prop([fc.openAlexWork()])('when the work is found', async work => {
    const getWork = vi.fn(() => Effect.succeed(work))

    await Effect.gen(function* ($) {
      const actual = yield* $(_.getWork(work.doi))

      expect(actual).toStrictEqual(Option.some(work))
    }).pipe(Effect.provideService(OpenAlexApi, { getWork }), Effect.provide(TestContext.TestContext), Effect.runPromise)

    expect(getWork).toHaveBeenNthCalledWith(1, work.doi)
  })

  test.prop([
    fc.doi(),
    fc.openAlexGetWorkError({
      cause: fc.httpClientStatusCodeResponseError({ status: fc.constant(StatusCodes.NOT_FOUND) }),
    }),
  ])("when the work isn't found", (doi, error) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getWork(doi))

      expect(actual).toStrictEqual(Option.none())
    }).pipe(
      Effect.provideService(OpenAlexApi, { getWork: () => Effect.fail(error) }),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.doi(), fc.openAlexGetWorkError()])("when the work can't be loaded", (doi, error) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getWork(doi), Effect.flip)

      expect(actual).toStrictEqual(error)
    }).pipe(
      Effect.provideService(OpenAlexApi, { getWork: () => Effect.fail(error) }),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
