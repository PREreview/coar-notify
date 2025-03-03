import { test } from '@fast-check/vitest'
import { Array, Effect, Layer, pipe } from 'effect'
import { describe, expect } from 'vitest'
import * as Datacite from '../src/Datacite.js'
import * as _ from '../src/DatacitePreprint.js'
import * as TestContext from './TestContext.js'
import * as fc from './fc.js'

describe('getPreprintFromDatacite', () => {
  test.prop([
    fc.doi(),
    fc.oneof(
      fc.tuple(fc.doi({ registrant: fc.constant('5281') }), fc.constant('zenodo')),
      fc.tuple(fc.doi({ registrant: fc.constant('48550') }), fc.constant('arxiv')),
      fc.tuple(fc.doi({ registrant: fc.constant('60763') }), fc.constant('africarxiv')),
    ),
    fc.string(),
    fc.option(fc.string(), { nil: undefined }),
    fc.oneof(fc.plainYearMonth(), fc.plainDate()),
    fc.constantFrom('Submitted', 'Created', 'Issued'),
  ])('when a work is found', (doi, [expectedDoi, expectedServer], expectedTitle, abstract, posted, dateType) =>
    Effect.gen(function* () {
      const actual = yield* _.getPreprintFromDatacite(doi)

      expect(actual).toStrictEqual({
        abstract,
        authors: ['Author 1', 'Author 2', 'Given Author 3'],
        doi: expectedDoi,
        posted,
        server: expectedServer,
        title: expectedTitle,
      })
    }).pipe(
      Effect.provide(
        Layer.succeed(Datacite.DataciteApi, {
          getWork: () =>
            Effect.succeed({
              creators: [
                { name: 'Author 1' },
                { familyName: 'Author 2' },
                { familyName: 'Author 3', givenName: 'Given' },
              ],
              descriptions:
                typeof abstract === 'string' ? [{ description: abstract, descriptionType: 'Abstract' }] : [],
              doi: expectedDoi,
              dates: Array.of({ date: posted, dateType }),
              titles: [{ title: expectedTitle }],
              types: { resourceType: 'Preprint' },
            }),
        }),
      ),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([
    fc.doi(),
    fc.dataciteWork({
      dates: fc.nonEmptyArray(
        fc.record({
          date: fc.plainYear(),
          dateType: fc.constant('Submitted'),
        }),
      ),
      doi: fc.doi({ registrant: fc.constantFrom('5281', '48550', '60763') }),
      descriptions: fc.array(
        fc.record({
          description: fc.string(),
          descriptionType: fc.constant('Abstract'),
        }),
      ),
      titles: fc.nonEmptyArray(fc.record({ title: fc.string() })),
      types: fc.constant({ resourceType: 'preprint' }),
    }),
  ])('when a work has an incomplete published date', (doi, work) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.getPreprintFromDatacite(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintFromDataciteError)
      expect(actual.message).toStrictEqual('Published date incomplete')
    }).pipe(
      Effect.provide(Layer.succeed(Datacite.DataciteApi, { getWork: () => Effect.succeed(work) })),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([
    fc.doi(),
    fc.dataciteWork({
      dates: fc.nonEmptyArray(
        fc.record({
          date: fc.oneof(fc.instant(), fc.plainYear(), fc.plainYearMonth(), fc.plainDate()),
          dateType: fc.string().filter(string => !['Submitted', 'Created', 'Issued'].includes(string.toLowerCase())),
        }),
      ),
      doi: fc.doi({ registrant: fc.constantFrom('5281', '48550', '60763') }),
      descriptions: fc.array(
        fc.record({
          description: fc.string(),
          descriptionType: fc.constant('Abstract'),
        }),
      ),
      titles: fc.nonEmptyArray(fc.record({ title: fc.string() })),
      types: fc.constant({ resourceType: 'preprint' }),
    }),
  ])("when a work doesn't have a published date", (doi, work) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.getPreprintFromDatacite(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintFromDataciteError)
      expect(actual.message).toStrictEqual('No published date found')
    }).pipe(
      Effect.provide(Layer.succeed(Datacite.DataciteApi, { getWork: () => Effect.succeed(work) })),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([
    fc.doi(),
    fc.oneof(
      fc.dataciteWork({
        doi: fc.doi({ registrant: fc.constantFrom('48550') }),
        types: fc.record(
          {
            resourceType: fc.string().filter(string => string !== 'preprint'),
            resourceTypeGeneral: fc.string().filter(string => !['preprint', 'text'].includes(string.toLowerCase())),
          },
          { withDeletedKeys: true },
        ),
      }),
      fc.dataciteWork({
        doi: fc.doi({ registrant: fc.constantFrom('60763') }),
        types: fc.record(
          {
            resourceType: fc.string().filter(string => string !== 'preprint'),
            resourceTypeGeneral: fc.string().filter(string => !['preprint', 'text'].includes(string.toLowerCase())),
          },
          { requiredKeys: ['resourceTypeGeneral'] },
        ),
      }),
      fc.dataciteWork({
        doi: fc.doi({ registrant: fc.doiRegistrant().filter(registrant => !['48550', '60763'].includes(registrant)) }),
        types: fc.constant({ resourceTypeGeneral: 'text' }),
      }),
    ),
  ])("when a work isn't a preprint", (doi, work) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.getPreprintFromDatacite(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintFromDataciteError)
      expect(actual.message).toStrictEqual('Not a preprint')
    }).pipe(
      Effect.provide(Layer.succeed(Datacite.DataciteApi, { getWork: () => Effect.succeed(work) })),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([
    fc.doi(),
    fc.oneof(
      fc.dataciteWork({
        doi: fc.doi({
          registrant: fc.doiRegistrant().filter(registrant => !['5281', '48550', '60763'].includes(registrant)),
        }),
        types: fc.record({
          resourceType: fc.constant('preprint'),
          resourceTypeGeneral: fc.constant('preprint'),
        }),
      }),
    ),
  ])("when the preprint server isn't supported", (doi, work) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.getPreprintFromDatacite(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintFromDataciteError)
      expect(actual.message).toStrictEqual('Not from a supported server')
    }).pipe(
      Effect.provide(Layer.succeed(Datacite.DataciteApi, { getWork: () => Effect.succeed(work) })),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )

  test.prop([fc.doi(), fc.string()])("when a work can't be found", (doi, message) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.getPreprintFromDatacite(doi), Effect.flip)

      expect(actual).toBeInstanceOf(_.GetPreprintFromDataciteError)
      expect(actual.message).toStrictEqual(message)
    }).pipe(
      Effect.provide(
        Layer.succeed(Datacite.DataciteApi, {
          getWork: () => Effect.fail(new Datacite.GetWorkError({ message })),
        }),
      ),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
