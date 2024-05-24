import { Schema } from '@effect/schema'
import { test } from '@fast-check/vitest'
import { Either } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../src/LanguageCode.js'
import * as fc from './fc.js'

describe('isLanguageCode', () => {
  test.prop([fc.languageCode().map(String)])('with a language code', value => {
    expect(_.isLanguageCode(value)).toBeTruthy()
  })

  test.prop([fc.fullUnicodeString().filter(s => /[^a-z]/.test(s) || s.length !== 2)], {
    examples: [['xx'], [' en'], ['en ']],
  })('with a non-language code', value => {
    expect(_.isLanguageCode(value)).toBeFalsy()
  })
})

describe('LanguageCodeSchema', () => {
  describe('decoding', () => {
    test.prop([fc.languageCode()])('with a language code', languageCode => {
      const actual = Schema.decodeUnknownSync(_.LanguageCodeSchema)(languageCode)

      expect(actual).toBe(languageCode)
    })

    test.prop([fc.fullUnicodeString().filter(s => /[^a-z]/.test(s) || s.length !== 2)], {
      examples: [['xx'], [' en'], ['en ']],
    })('with a non-language code', value => {
      const actual = Schema.decodeUnknownEither(_.LanguageCodeSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.languageCode()])('encoding', languageCode => {
    const actual = Schema.encodeSync(_.LanguageCodeSchema)(languageCode)

    expect(actual).toStrictEqual(languageCode)
  })
})
