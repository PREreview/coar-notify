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
      ['10.1002/(SICI)1096-8644(199808)106:4<483::AID-AJPA4>3.0.CO;2-K'],
      ['10.0000/.a'],
      ['10.0000/..a'],
      ['10.0000/./'],
      ['10.0000/../'],
    ],
  })('with a DOI', value => {
    expect(_.Doi.is(value)).toBeTruthy()
  })

  test.prop([fc.fullUnicodeString().filter(s => !s.includes('/') || !s.startsWith('10.'))], {
    examples: [
      ['10..1000/journal.pone.0011111'],
      ['1.1/1.1'],
      ['10/134980'],
      ['10.001/001#00'],
      ['10.1000/456%23789'],
      ['10.0000/.'],
      ['10.0000/..'],
    ],
  })('with a non-DOI', value => {
    expect(_.Doi.is(value)).toBeFalsy()
  })
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
      [
        [
          _.Doi('10.1002/(SICI)1096-8644(199808)106:4<483::AID-AJPA4>3.0.CO;2-K'),
          'https://doi.org/10.1002/(SICI)1096-8644(199808)106:4%3C483::AID-AJPA4%3E3.0.CO;2-K',
        ],
      ],
      [[_.Doi('10.1000/./'), 'https://doi.org/10.1000/.%2F']],
      [[_.Doi('10.1000/../'), 'https://doi.org/10.1000/..%2F']],
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

    test.prop([fc.fullUnicodeString().filter(s => !s.includes('/') || !s.startsWith('10.'))])(
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

describe('DoiUrlSchema', () => {
  describe('decoding', () => {
    test.prop([
      fc
        .tuple(
          fc.constantFrom('doi:', 'https://doi.org/', 'http://doi.org/', 'https://dx.doi.org/', 'http://dx.doi.org/'),
          fc.doi(),
        )
        .map(([prefix, doi]) => [doi, `${prefix}${doi}`] satisfies [_.Doi, string]),
    ])('with a DOI', ([expected, value]) => {
      const actual = Schema.decodeUnknownSync(_.DoiUrlSchema)(value)

      expect(actual).toBe(expected)
    })

    test.prop([fc.fullUnicodeString().filter(s => !s.includes('/') || !s.includes('10.') || !s.includes('doi.org'))])(
      'with a non-DOI',
      value => {
        const actual = Schema.decodeUnknownEither(_.DoiUrlSchema)(value)

        expect(actual).toStrictEqual(Either.left(expect.anything()))
      },
    )
  })

  test.prop([fc.doi()])('encoding', doi => {
    const actual = Schema.encodeSync(_.DoiUrlSchema)(doi)

    expect(actual).toStrictEqual(_.toUrl(doi).href)
  })
})
