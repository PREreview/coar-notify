import { test } from '@fast-check/vitest'
import { Effect, Layer } from 'effect'
import { describe, expect } from 'vitest'
import * as Crossref from '../src/Crossref.js'
import * as _ from '../src/Preprint.js'
import * as TestContext from './TestContext.js'
import * as fc from './fc.js'

describe('getPreprint', () => {
  test.prop([fc.doi(), fc.doi()])('when a work is found', (doi, expectedDoi) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprint(doi))

      expect(actual).toStrictEqual({ doi: expectedDoi })
    }).pipe(
      Effect.provide(Layer.succeed(Crossref.CrossrefApi, { getWork: () => Effect.succeed({ DOI: expectedDoi }) })),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.doi(), fc.string()])("when a work can't be found", (doi, message) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprint(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintError)
      expect(actual.message).toStrictEqual(message)
    }).pipe(
      Effect.provide(
        Layer.succeed(Crossref.CrossrefApi, {
          getWork: () => Effect.fail(new Crossref.GetWorkError({ message })),
        }),
      ),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
