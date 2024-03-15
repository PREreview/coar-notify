import { test } from '@fast-check/vitest'
import { Effect, Layer } from 'effect'
import { describe, expect } from 'vitest'
import * as Crossref from '../src/Crossref.js'
import * as _ from '../src/Preprint.js'
import * as TestContext from './TestContext.js'
import * as fc from './fc.js'

describe('getPreprint', () => {
  test.prop([
    fc.doi(),
    fc.oneof(
      fc.tuple(fc.doi({ registrant: fc.constant('1101') }), fc.constant([{ name: 'bioRxiv' }]), fc.constant('biorxiv')),
      fc.tuple(
        fc.doi({ registrant: fc.constant('1590') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.constant('scielo'),
      ),
    ),
    fc.string().filter(string => !/[&<>]/.test(string)),
    fc.plainDate(),
  ])('when a work is found', (doi, [expectedDoi, institution, expectedServer], expectedTitle, posted) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprint(doi))

      expect(actual).toStrictEqual({
        authors: ['Author 1', 'Author 2', 'Prefix Given Author 3 Suffix'],
        doi: expectedDoi,
        posted,
        server: expectedServer,
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
              institution,
              published: posted,
              subtype: 'preprint',
              title: [expectedTitle],
              type: 'posted-content',
            }),
        }),
      ),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([
    fc.doi(),
    fc.oneof(
      fc.tuple(fc.doi({ registrant: fc.constant('1101') }), fc.constant([{ name: 'bioRxiv' }])),
      fc.tuple(
        fc.doi({ registrant: fc.constant('1590') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
      ),
    ),
    fc.plainDate(),
  ])('when the title contains HTML', (doi, [expectedDoi, institution], posted) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprint(doi))

      expect(actual).toMatchObject({ title: "Some &amp; &lt; &gt; ' Title" })
    }).pipe(
      Effect.provide(
        Layer.succeed(Crossref.CrossrefApi, {
          getWork: () =>
            Effect.succeed({
              author: [{ name: 'Author' }],
              DOI: expectedDoi,
              institution,
              published: posted,
              subtype: 'preprint',
              title: ['Some &amp; &lt; &gt; &apos; <i><b>T</b>itle</i>'],
              type: 'posted-content',
            }),
        }),
      ),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([
    fc.doi(),
    fc.oneof(
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('1101') }),
        institution: fc.constant([{ name: 'bioRxiv' }]),
        title: fc.constant([]),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('1590') }),
        title: fc.constant([]),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
    ),
  ])("when a work doesn't have a title", (doi, work) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprint(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintError)
      expect(actual.message).toStrictEqual('No title found')
    }).pipe(
      Effect.provide(Layer.succeed(Crossref.CrossrefApi, { getWork: () => Effect.succeed(work) })),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([
    fc.doi(),
    fc.oneof(
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('1101') }),
        institution: fc.constant([{ name: 'bioRxiv' }]),
        published: fc.oneof(fc.plainYear(), fc.plainYearMonth()),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('1590') }),
        published: fc.oneof(fc.plainYear(), fc.plainYearMonth()),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
    ),
  ])('when a work has an incomplete published date', (doi, work) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprint(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintError)
      expect(actual.message).toStrictEqual('Published date incomplete')
    }).pipe(
      Effect.provide(Layer.succeed(Crossref.CrossrefApi, { getWork: () => Effect.succeed(work) })),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([
    fc.doi(),
    fc.oneof(
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('1101') }),
        institution: fc.constant([{ name: 'bioRxiv' }]),
        published: fc.constant(undefined),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('1590') }),
        published: fc.constant(undefined),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
    ),
  ])("when a work doesn't have a published date", (doi, work) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprint(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintError)
      expect(actual.message).toStrictEqual('No published date found')
    }).pipe(
      Effect.provide(Layer.succeed(Crossref.CrossrefApi, { getWork: () => Effect.succeed(work) })),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([
    fc.doi(),
    fc.oneof(
      fc.crossrefWork({
        type: fc.string().filter(string => string !== 'posted-content'),
      }),
      fc.crossrefWork({
        type: fc.constant('posted-content'),
        subtype: fc.string().filter(string => string !== 'preprint'),
      }),
    ),
  ])("when a work isn't a preprint", (doi, work) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprint(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintError)
      expect(actual.message).toStrictEqual('Not a preprint')
    }).pipe(
      Effect.provide(Layer.succeed(Crossref.CrossrefApi, { getWork: () => Effect.succeed(work) })),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([
    fc.doi(),
    fc.oneof(
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.doiRegistrant().filter(registrant => !['1101', '1590'].includes(registrant)) }),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('1101') }),
        institution: fc.array(fc.record({ name: fc.string().filter(name => name !== 'bioRxiv') })),
        title: fc.constant([]),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
    ),
  ])("when the preprint server isn't supported", (doi, work) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprint(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintError)
      expect(actual.message).toStrictEqual('Not from a supported server')
    }).pipe(
      Effect.provide(Layer.succeed(Crossref.CrossrefApi, { getWork: () => Effect.succeed(work) })),
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
