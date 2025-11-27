import { test } from '@fast-check/vitest'
import { Effect, Layer, pipe } from 'effect'
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
        fc.doi({ registrant: fc.constantFrom('1101', '64898') }),
        fc.constant([{ name: 'bioRxiv' }]),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('biorxiv'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constantFrom('1101', '64898') }),
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
        fc.doi({ registrant: fc.constant('21203') }),
        fc.constant([{ name: 'Research Square' }]),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('research-square'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('26434') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('chemrxiv'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('31124') }),
        fc.constant([{ name: 'Advance' }]),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('advance'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('31219') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.constant('Open Science Framework'),
        fc.constant('osf-preprints'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('20944') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('preprints.org'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('31234') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.constant('PsyArXiv'),
        fc.constant('psyarxiv'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('31222') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('metaarxiv'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('31223') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('eartharxiv'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('31224') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('engrxiv'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('31235') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.constant('SocArXiv'),
        fc.constant('socarxiv'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('32942') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('ecoevorxiv'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('35542') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.constant('EdArXiv'),
        fc.constant('edarxiv'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('36227') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('techrxiv'),
      ),
      fc.tuple(
        fc.doi({ registrant: fc.constant('55458') }),
        fc.option(fc.array(fc.record({ name: fc.string() })), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        fc.constant('neurolibre'),
      ),
    ),
    fc.string(),
    fc.option(fc.string(), { nil: undefined }),
    fc.plainDate(),
  ])(
    'when a work is found',
    (doi, [expectedDoi, institution, groupTitle, expectedServer], expectedTitle, abstract, posted) =>
      Effect.gen(function* () {
        const actual = yield* _.getPreprintFromCrossref(doi)

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
        DOI: fc.doi({ registrant: fc.constantFrom('1101', '64898') }),
        institution: fc.constantFrom([{ name: 'bioRxiv' }], [{ name: 'medRxiv' }]),
        title: fc.constant([]),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({
          registrant: fc.constantFrom('1590', '20944', '26434', '31222', '31223', '31224', '32942', '36227', '55458'),
        }),
        title: fc.constant([]),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('21203') }),
        institution: fc.constantFrom([{ name: 'Research Square' }]),
        title: fc.constant([]),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('31124') }),
        institution: fc.constantFrom([{ name: 'Advance' }]),
        title: fc.constant([]),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('31219') }),
        'group-title': fc.constant('Open Science Framework'),
        title: fc.constant([]),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('31234') }),
        'group-title': fc.constant('PsyArXiv'),
        title: fc.constant([]),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('31235') }),
        'group-title': fc.constant('SocArXiv'),
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
    Effect.gen(function* () {
      const actual = yield* pipe(_.getPreprintFromCrossref(doi), Effect.flip)

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
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constantFrom('1101', '64898') }),
        institution: fc.constantFrom([{ name: 'bioRxiv' }], [{ name: 'medRxiv' }]),
        published: fc.oneof(fc.plainYear(), fc.plainYearMonth()),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({
          registrant: fc.constantFrom('1590', '20944', '26434', '31222', '31223', '31224', '32942', '36227', '55458'),
        }),
        published: fc.oneof(fc.plainYear(), fc.plainYearMonth()),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constant('21203') }),
        institution: fc.constant([{ name: 'Research Square' }]),
        published: fc.oneof(fc.plainYear(), fc.plainYearMonth()),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constant('31124') }),
        institution: fc.constant([{ name: 'Advance' }]),
        published: fc.oneof(fc.plainYear(), fc.plainYearMonth()),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constant('31219') }),
        'group-title': fc.constant('Open Science Framework'),
        published: fc.oneof(fc.plainYear(), fc.plainYearMonth()),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constant('31234') }),
        'group-title': fc.constant('PsyArXiv'),
        published: fc.oneof(fc.plainYear(), fc.plainYearMonth()),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constant('31235') }),
        'group-title': fc.constant('SocArXiv'),
        published: fc.oneof(fc.plainYear(), fc.plainYearMonth()),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constant('35542') }),
        'group-title': fc.constant('EdArXiv'),
        published: fc.oneof(fc.plainYear(), fc.plainYearMonth()),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
    ),
  ])('when a work has an incomplete published date', (doi, work) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.getPreprintFromCrossref(doi), Effect.flip)

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
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constantFrom('1101', '64898') }),
        institution: fc.constantFrom([{ name: 'bioRxiv' }], [{ name: 'medRxiv' }]),
        published: fc.constant(undefined),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({
          registrant: fc.constantFrom('1590', '20944', '26434', '31222', '31223', '31224', '32942', '36227'),
        }),
        published: fc.constant(undefined),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constant('21203') }),
        institution: fc.constant([{ name: 'Research Square' }]),
        published: fc.constant(undefined),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constant('31124') }),
        institution: fc.constant([{ name: 'Advance' }]),
        published: fc.constant(undefined),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constant('31219') }),
        'group-title': fc.constant('Open Science Framework'),
        published: fc.constant(undefined),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constant('31234') }),
        'group-title': fc.constant('PsyArXiv'),
        published: fc.constant(undefined),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constant('31235') }),
        'group-title': fc.constant('SocArXiv'),
        published: fc.constant(undefined),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        abstract: fc.option(fc.string(), { nil: undefined }),
        DOI: fc.doi({ registrant: fc.constant('35542') }),
        'group-title': fc.constant('EdArXiv'),
        published: fc.constant(undefined),
        title: fc.nonEmptyArray(fc.string()),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
    ),
  ])("when a work doesn't have a published date", (doi, work) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.getPreprintFromCrossref(doi), Effect.flip)

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
    Effect.gen(function* () {
      const actual = yield* pipe(_.getPreprintFromCrossref(doi), Effect.flip)

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
        DOI: fc.doi({
          registrant: fc
            .doiRegistrant()
            .filter(
              registrant =>
                ![
                  '1590',
                  '20944',
                  '21203',
                  '26434',
                  '31124',
                  '31222',
                  '31223',
                  '31224',
                  '32942',
                  '36227',
                  '55458',
                ].includes(registrant),
            ),
        }),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constantFrom('1101', '64898') }),
        institution: fc.array(
          fc.record({ name: fc.string().filter(name => !['Advance', 'bioRxiv', 'medRxiv'].includes(name)) }),
        ),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('21203') }),
        institution: fc.array(fc.record({ name: fc.string().filter(name => name !== 'Research Square') })),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('31219') }),
        'group-title': fc.string().filter(name => name !== 'Open Science Framework'),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('31234') }),
        'group-title': fc.string().filter(name => name !== 'PsyArXiv'),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('31235') }),
        'group-title': fc.string().filter(name => name !== 'SocArXiv'),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
      fc.crossrefWork({
        DOI: fc.doi({ registrant: fc.constant('35542') }),
        'group-title': fc.string().filter(name => name !== 'EdArXiv'),
        type: fc.constant('posted-content'),
        subtype: fc.constant('preprint'),
      }),
    ),
  ])("when the preprint server isn't supported", (doi, work) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.getPreprintFromCrossref(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintFromCrossrefError)
      expect(actual.message).toStrictEqual('Not from a supported server')
    }).pipe(
      Effect.provide(Layer.succeed(Crossref.CrossrefApi, { getWork: () => Effect.succeed(work) })),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.doi(), fc.string()])("when a work can't be found", (doi, message) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.getPreprintFromCrossref(doi), Effect.flip)

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
