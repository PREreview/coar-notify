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

describe('PlainDateInTupleSchema', () => {
  describe('decoding', () => {
    test.prop([fc.plainDate()])('with date parts', plainDate => {
      const actual = Schema.decodeUnknownSync(_.PlainDateInTupleSchema)([
        plainDate.year,
        plainDate.month,
        plainDate.day,
      ])

      expect(actual).toStrictEqual(plainDate)
    })

    test.prop([
      fc.oneof(
        fc.anything().filter(value => !Array.isArray(value)),
        fc.array(fc.anything().filter(value => !(typeof value === 'number'))),
        fc.array(fc.double()),
        fc.tuple(
          fc.integer(),
          fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 13 })),
          fc.integer({ min: 1, max: 31 }),
        ),
        fc.tuple(
          fc.integer(),
          fc.integer({ min: 1, max: 12 }),
          fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 32 })),
        ),
        fc.nonEmptyArray(fc.integer(), { maxLength: 2 }),
        fc.nonEmptyArray(fc.integer(), { minLength: 4 }),
      ),
    ])('with non-date parts', value => {
      const actual = Schema.decodeUnknownEither(_.PlainDateInTupleSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.plainDate()])('encoding', plainDate => {
    const actual = Schema.encodeSync(_.PlainDateInTupleSchema)(plainDate)

    expect(actual).toStrictEqual([plainDate.year, plainDate.month, plainDate.day])
  })
})
