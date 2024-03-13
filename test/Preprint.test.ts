import { test } from '@fast-check/vitest'
import { Effect, Layer } from 'effect'
import { describe, expect } from 'vitest'
import * as Crossref from '../src/Crossref.js'
import * as _ from '../src/Preprint.js'
import * as TestContext from './TestContext.js'
import * as fc from './fc.js'

describe('getPreprint', () => {
  test.prop([fc.doi(), fc.doi(), fc.string().filter(string => !/[&<>]/.test(string))])(
    'when a work is found',
    (doi, expectedDoi, expectedTitle) =>
      Effect.gen(function* ($) {
        const actual = yield* $(_.getPreprint(doi))

        expect(actual).toStrictEqual({
          authors: ['Author 1', 'Author 2', 'Prefix Given Author 3 Suffix'],
          doi: expectedDoi,
          title: expectedTitle,
        })
      }).pipe(
        Effect.provide(
          Layer.succeed(Crossref.CrossrefApi, {
            getWork: () =>
              Effect.succeed({
                author: [
                  { name: 'Author 1' },
                  { family: 'Author 2' },
                  { family: 'Author 3', given: 'Given', prefix: 'Prefix', suffix: 'Suffix' },
                ],
                DOI: expectedDoi,
                title: [expectedTitle],
              }),
          }),
        ),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.doi(), fc.doi()])('when the title contains HTML', (doi, expectedDoi) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprint(doi))

      expect(actual).toStrictEqual({ authors: ['Author'], doi: expectedDoi, title: "Some &amp; &lt; &gt; ' Title" })
    }).pipe(
      Effect.provide(
        Layer.succeed(Crossref.CrossrefApi, {
          getWork: () =>
            Effect.succeed({
              author: [{ name: 'Author' }],
              DOI: expectedDoi,
              title: ['Some &amp; &lt; &gt; &apos; <i><b>T</b>itle</i>'],
            }),
        }),
      ),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.doi(), fc.doi(), fc.string()])("when a work doesn't have a title", (doi, expectedDoi) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprint(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintError)
      expect(actual.message).toStrictEqual('No title found')
    }).pipe(
      Effect.provide(
        Layer.succeed(Crossref.CrossrefApi, {
          getWork: () => Effect.succeed({ author: [{ name: 'Author' }], DOI: expectedDoi, title: [] }),
        }),
      ),
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
