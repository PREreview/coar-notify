import { Schema } from '@effect/schema'
import { test } from '@fast-check/vitest'
import { Either } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../src/Url.js'
import * as fc from './fc.js'

describe('UrlFromSelfSchema', () => {
  describe('decoding', () => {
    test.prop([fc.url()])('with an url', url => {
      const actual = Schema.decodeUnknownSync(_.UrlFromSelfSchema)(url)

      expect(actual).toStrictEqual(url)
    })

    test.prop([fc.anything()])('with a non-url', value => {
      const actual = Schema.decodeUnknownEither(_.UrlFromSelfSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.url()])('encoding', url => {
    const actual = Schema.encodeSync(_.UrlFromSelfSchema)(url)

    expect(actual).toStrictEqual(url)
  })
})

describe('UrlFromStringSchema', () => {
  describe('decoding', () => {
    test.prop([fc.url()])('with a URL', url => {
      const actual = Schema.decodeUnknownSync(_.UrlFromStringSchema)(url.href)

      expect(actual).toStrictEqual(url)
    })

    test.prop([fc.anything().filter(value => typeof value !== 'string' || !URL.canParse(value))])(
      'with a non-URL',
      value => {
        const actual = Schema.decodeUnknownEither(_.UrlFromStringSchema)(value)

        expect(actual).toStrictEqual(Either.left(expect.anything()))
      },
    )
  })

  test.prop([fc.url()])('encoding', url => {
    const actual = Schema.encodeSync(_.UrlFromStringSchema)(url)

    expect(actual).toStrictEqual(url.href)
  })
})
