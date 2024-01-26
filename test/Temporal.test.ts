import { Schema } from '@effect/schema'
import { test } from '@fast-check/vitest'
import { Effect, Either, TestClock, TestContext } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../src/Temporal.js'
import * as fc from './fc.js'

test.prop([fc.epochMilliseconds()])('Timestamp', epochMilliseconds =>
  Effect.gen(function* ($) {
    yield* $(TestClock.setTime(epochMilliseconds))

    const actual = yield* $(_.Timestamp)

    expect(actual.epochMilliseconds).toStrictEqual(epochMilliseconds)
  }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
)

describe('InstantFromSelfSchema', () => {
  describe('decoding', () => {
    test.prop([fc.instant()])('with an instant', instant => {
      const actual = Schema.decodeUnknownSync(_.InstantFromSelfSchema)(instant)

      expect(actual.epochMilliseconds).toStrictEqual(instant.epochMilliseconds)
    })

    test.prop([fc.anything()])('with a non-instant', value => {
      const actual = Schema.decodeUnknownEither(_.InstantFromSelfSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.instant()])('encoding', instant => {
    const actual = Schema.encodeSync(_.InstantFromSelfSchema)(instant)

    expect(actual.epochMilliseconds).toStrictEqual(instant.epochMilliseconds)
  })
})

describe('InstantInMillisecondsSchema', () => {
  describe('decoding', () => {
    test.prop([fc.epochMilliseconds()])('with milliseconds', epochMilliseconds => {
      const actual = Schema.decodeUnknownSync(_.InstantInMillisecondsSchema)(epochMilliseconds)

      expect(actual.epochMilliseconds).toStrictEqual(epochMilliseconds)
    })

    test.prop([fc.anything().filter(value => typeof value !== 'number' || !Number.isInteger(value))])(
      'with non-milliseconds',
      value => {
        const actual = Schema.decodeUnknownEither(_.InstantInMillisecondsSchema)(value)

        expect(actual).toStrictEqual(Either.left(expect.anything()))
      },
    )
  })

  test.prop([fc.instant()])('encoding', instant => {
    const actual = Schema.encodeSync(_.InstantInMillisecondsSchema)(instant)

    expect(actual).toStrictEqual(instant.epochMilliseconds)
  })
})
