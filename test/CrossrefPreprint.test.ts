import { test } from '@fast-check/vitest'
import { Effect, Layer } from 'effect'
import { describe, expect } from 'vitest'
import * as Crossref from '../src/Crossref.js'
import * as _ from '../src/CrossrefPreprint.js'
import * as TestContext from './TestContext.js'
import * as fc from './fc.js'

describe('getPreprintFromCrossref', () => {
  test.prop([
    fc.doi(),
    fc.oneof(
      fc.tuple(
        fc.doi({ registrant: fc.constant('1101') }),
        fc.constant([{ name: 'bioRxiv' }]),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('biorxiv'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('1101') }),
        fc.constant([{ name: 'medRxiv' }]),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('medrxiv'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('1590') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('scielo'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('35542') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.constant('EdArXiv'),
        fc.constant('edarxiv'),
      ),
    ),
    fc.string(),
    fc.string(),
    fc.plainDate(),
  ])(
    'when a work is found',
    (doi, [expectedDoi, institution, groupTitle, expectedServer], expectedTitle, abstract, posted) =>
      Effect.gen(function* ($) {
        const actual = yield* $(_.getPreprintFromCrossref(doi))

        expect(actual).toStrictEqual({
          abstract,
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
                abstract,
                author: [
                  { name: 'Author 1' },
                  { family: 'Author 2' },
                  { family: 'Author 3', given: 'Given', prefix: 'Prefix', suffix: 'Suffix' },
                ],
                DOI: expectedDoi,
                'group-title': groupTitle,
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
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('1101') }),
        institution: fc.constantFrom([{ name: 'bioRxiv' }], [{ name: 'medRxiv' }]),
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
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('35542') }),
        'group-title': fc.constant('EdArXiv'),
        title: fc.constant([]),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
    ),
  ])("when a work doesn't have a title", (doi, work) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprintFromCrossref(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintFromCrossrefError)
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
        abstract: fc.constant(undefined),
        DOI: fc.doi({ registrant: fc.constant('1101') }),
        institution: fc.constantFrom([{ name: 'bioRxiv' }], [{ name: 'medRxiv' }]),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.constant(undefined),
        DOI: fc.doi({ registrant: fc.constant('1590') }),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.constant(undefined),
        DOI: fc.doi({ registrant: fc.constant('35542') }),
        'group-title': fc.constant('EdArXiv'),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
    ),
  ])("when a work doesn't have an abstract", (doi, work) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprintFromCrossref(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintFromCrossrefError)
      expect(actual.message).toStrictEqual('No abstract found')
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
        abstract: fc.string(),
        DOI: fc.doi({ registrant: fc.constant('1101') }),
        institution: fc.constantFrom([{ name: 'bioRxiv' }], [{ name: 'medRxiv' }]),
        published: fc.oneof(fc.plainYear(), fc.plainYearMonth()),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.string(),
        DOI: fc.doi({ registrant: fc.constant('1590') }),
        published: fc.oneof(fc.plainYear(), fc.plainYearMonth()),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.string(),
        DOI: fc.doi({ registrant: fc.constant('35542') }),
        'group-title': fc.constant('EdArXiv'),
        published: fc.oneof(fc.plainYear(), fc.plainYearMonth()),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
    ),
  ])('when a work has an incomplete published date', (doi, work) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprintFromCrossref(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintFromCrossrefError)
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
        abstract: fc.string(),
        DOI: fc.doi({ registrant: fc.constant('1101') }),
        institution: fc.constantFrom([{ name: 'bioRxiv' }], [{ name: 'medRxiv' }]),
        published: fc.constant(undefined),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.string(),
        DOI: fc.doi({ registrant: fc.constant('1590') }),
        published: fc.constant(undefined),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.string(),
        DOI: fc.doi({ registrant: fc.constant('35542') }),
        'group-title': fc.constant('EdArXiv'),
        published: fc.constant(undefined),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
    ),
  ])("when a work doesn't have a published date", (doi, work) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprintFromCrossref(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintFromCrossrefError)
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
      const actual = yield* $(_.getPreprintFromCrossref(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintFromCrossrefError)
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
        DOI: fc.doi({ registrant: fc.doiRegistrant().filter(registrant => !['1590'].includes(registrant)) }),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('1101') }),
        institution: fc.array(fc.record({ name: fc.string().filter(name => !['bioRxiv', 'medRxiv'].includes(name)) })),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('35542') }),
        institution: fc.array(fc.record({ name: fc.string().filter(name => name !== 'EdArXiv') })),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
    ),
  ])("when the preprint server isn't supported", (doi, work) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprintFromCrossref(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintFromCrossrefError)
      expect(actual.message).toStrictEqual('Not from a supported server')
    }).pipe(
      Effect.provide(Layer.succeed(Crossref.CrossrefApi, { getWork: () => Effect.succeed(work) })),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.doi(), fc.string()])("when a work can't be found", (doi, message) =>
    Effect.gen(function* ($) {
      const actual = yield* $(_.getPreprintFromCrossref(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintFromCrossrefError)
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
