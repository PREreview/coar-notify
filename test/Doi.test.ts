import { Schema } from '@effect/schema'
import { test } from '@fast-check/vitest'
import { Either } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../src/Doi.js'
import * as fc from './fc.js'

describe('Doi', () => {
  test.prop([fc.doi().map(String)], {
    examples: [
      ['10.0001/journal.pone.000001'],
      ['10.0001/journal/pone.0011111'],
      ['10.0001.112/journal.pone.0011021'],
      ['10.0001/issn.10001'],
      ['10.10.123/456'],
      ['10.1000/456#789'],
      ['10.1000/456%23%23789'],
      ['10.1002/(SICI)1521-3951(199911)216:1<135::AID-PSSB135>3.0.CO;2-#'],
      ['10.0000/.a'],
      ['10.0000/..a'],
      ['10.0000/./'],
      ['10.0000/../'],
      ['10.0000/...'],
      ['10.0000/.../'],
      ['10.0000/\\'],
    ],
  })('with a DOI', value => {
    expect(_.Doi.is(value)).toBeTruthy()
  })

  test.prop([fc.string({ unit: 'grapheme' }).filter(s => /\s/.test(s) || !s.includes('/') || !s.startsWith('10.'))], {
    examples: [['10..1000/journal.pone.0011111'], ['1.1/1.1'], ['10/134980'], ['10.0000/.'], ['10.0000/..']],
  })('with a non-DOI', value => {
    expect(_.Doi.is(value)).toBeFalsy()
  })
})

describe('hasRegistrant', () => {
  test.prop([
    fc
      .nonEmptyArray(fc.doiRegistrant())
      .chain(registrants =>
        fc.tuple(fc.constant(registrants), fc.doi({ registrant: fc.constantFrom(...registrants) })),
      ),
  ])('when the registrant matches', ([registrants, doi]) => {
    expect(_.hasRegistrant(...registrants)(doi)).toBeTruthy()
  })

  test.prop([fc.array(fc.doiRegistrant()), fc.doi()])('when the registrant does not match', (registrants, doi) => {
    expect(_.hasRegistrant(...registrants)(doi)).toBeFalsy()
  })
})

test.prop([
  fc
    .doiRegistrant()
    .chain(registrant => fc.tuple(fc.constant(registrant), fc.doi({ registrant: fc.constant(registrant) }))),
])('getRegistrant', ([registrant, doi]) => {
  expect(_.getRegistrant(doi)).toStrictEqual(registrant)
})

test.prop(
  [
    fc
      .doi({
        suffix: fc.string({ minLength: 1 }).filter(s => !/[\\/]/.test(s)),
      })
      .map(doi => [doi, new URL(`https://doi.org/${doi}`).href] satisfies [_.Doi, string]),
  ],
  {
    examples: [
      [[_.Doi('10.0001/journal/pone.0011111'), 'https://doi.org/10.0001/journal/pone.0011111']],
      [[_.Doi('10.1000/456#789'), 'https://doi.org/10.1000/456%23789']],
      [[_.Doi('10.1000/456%23%23789'), 'https://doi.org/10.1000/456%2523%2523789']],
      [
        [
          _.Doi('10.1002/(SICI)1521-3951(199911)216:1<135::AID-PSSB135>3.0.CO;2-#'),
          'https://doi.org/10.1002/(SICI)1521-3951(199911)216:1%3C135::AID-PSSB135%3E3.0.CO;2-%23',
        ],
      ],
      [[_.Doi('10.1000/./'), 'https://doi.org/10.1000/.%2F']],
      [[_.Doi('10.1000/../'), 'https://doi.org/10.1000/..%2F']],
      [[_.Doi('10.1000/...'), 'https://doi.org/10.1000/...']],
      [[_.Doi('10.1000/.../'), 'https://doi.org/10.1000/.../']],
      [[_.Doi('10.1000/\\'), 'https://doi.org/10.1000/%5C']],
      [[_.Doi('10.1000/\u0000'), 'https://doi.org/10.1000/%00']],
    ],
  },
)('toUrl', ([doi, url]) => {
  expect(_.toUrl(doi).href).toStrictEqual(url)
})

describe('DoiSchema', () => {
  describe('decoding', () => {
    test.prop([fc.doi()])('with a DOI', doi => {
      const actual = Schema.decodeUnknownSync(_.DoiSchema)(doi)

      expect(actual).toBe(doi)
    })

    test.prop([fc.string({ unit: 'grapheme' }).filter(s => /\s/.test(s) || !s.includes('/') || !s.startsWith('10.'))])(
      'with a non-DOI',
      value => {
        const actual = Schema.decodeUnknownEither(_.DoiSchema)(value)

        expect(actual).toStrictEqual(Either.left(expect.anything()))
      },
    )
  })

  test.prop([fc.doi()])('encoding', doi => {
    const actual = Schema.encodeSync(_.DoiSchema)(doi)

    expect(actual).toStrictEqual(doi)
  })
})

describe('DoiFromUrlSchema', () => {
  describe('decoding', () => {
    test.prop(
      [
        fc.oneof(
          fc.doi().map(doi => [doi, `doi:${doi}`] satisfies [_.Doi, string]),
          fc
            .tuple(fc.doi(), fc.constantFrom('https', 'http'), fc.constantFrom('doi.org', 'dx.doi.org'))
            .map(
              ([doi, scheme, host]) =>
                [doi, new URL(`${scheme}://${host}/${encodeURI(doi)}`).href] satisfies [_.Doi, string],
            ),
        ),
      ],
      {
        examples: [
          [[_.Doi('10.0001/journal/pone.0011111'), 'https://doi.org/10.0001/journal/pone.0011111']],
          [[_.Doi('10.1000/456#789'), 'https://doi.org/10.1000/456%23789']],
          [[_.Doi('10.1000/456%23%23789'), 'https://doi.org/10.1000/456%2523%2523789']],
          [
            [
              _.Doi('10.1002/(SICI)1521-3951(199911)216:1<135::AID-PSSB135>3.0.CO;2-#'),
              'https://doi.org/10.1002/(SICI)1521-3951(199911)216:1%3C135::AID-PSSB135%3E3.0.CO;2-%23',
            ],
          ],
          [[_.Doi('10.1000/./'), 'https://doi.org/10.1000/.%2F']],
          [[_.Doi('10.1000/../'), 'https://doi.org/10.1000/..%2F']],
          [[_.Doi('10.1000/...'), 'https://doi.org/10.1000/...']],
          [[_.Doi('10.1000/.../'), 'https://doi.org/10.1000/.../']],
          [[_.Doi('10.1000/\\'), 'https://doi.org/10.1000/%5C']],
        ],
      },
    )('with a DOI', ([expected, value]) => {
      const actual = Schema.decodeUnknownSync(_.DoiFromUrlSchema)(value)

      expect(actual).toBe(expected)
    })

    test.prop([
      fc
        .string({ unit: 'grapheme' })
        .filter(s => /\s/.test(s) || !s.includes('/') || !s.includes('10.') || !s.includes('doi.org')),
    ])('with a non-DOI', value => {
      const actual = Schema.decodeUnknownEither(_.DoiFromUrlSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.doi()])('encoding', doi => {
    const actual = Schema.encodeSync(_.DoiFromUrlSchema)(doi)

    expect(actual).toStrictEqual(_.toUrl(doi).href)
  })
})
