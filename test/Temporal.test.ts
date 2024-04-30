import { Schema } from '@effect/schema'
import { test } from '@fast-check/vitest'
import { Effect, Either, Number as Number_, Option, TestClock, TestContext } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../src/Temporal.js'
import * as fc from './fc.js'

describe('PlainYear', () => {
  test.prop([fc.integer({ min: -271820, max: 275760 })])('with a year', year => {
    const actual = new _.PlainYear(year)

    expect(actual.year).toStrictEqual(year)
  })

  test.prop([fc.oneof(fc.double({ max: -271821 }), fc.double({ min: 275761 }))])('with a non-year', value => {
    expect(() => new _.PlainYear(value)).toThrow()
  })

  describe('from', () => {
    describe('with a string', () => {
      test.prop([fc.integer({ min: -271820, max: 275760 })])('with a year', year => {
        const actual = _.PlainYear.from(
          year < 0 || year > 9999
            ? (year < 0 ? '-' : '+') + `000000${Math.abs(year)}`.slice(-6)
            : `0000${year}`.slice(-4),
        )

        expect(actual.year).toStrictEqual(year)
      })

      test.prop([
        fc
          .oneof(
            fc.fullUnicodeString().filter(s => Option.isNone(Number_.parse(s))),
            fc.double({ max: -271821 }),
            fc.double({ min: 275761 }),
            fc.double({ min: -1000, max: 1000, minExcluded: true, maxExcluded: true }),
          )
          .map(String),
      ])('with a non-year', value => {
        expect(() => _.PlainYear.from(value, { overflow: 'reject' })).toThrow()
      })
    })

    describe('with an object', () => {
      test.prop([fc.integer({ min: -271820, max: 275760 })])('with a year', year => {
        const actual = _.PlainYear.from({ year })

        expect(actual.year).toStrictEqual(year)
      })

      test.prop([fc.oneof(fc.double({ max: -271821 }), fc.double({ min: 275761 }))])('with a non-year', value => {
        expect(() => _.PlainYear.from({ year: value }, { overflow: 'reject' })).toThrow()
      })
    })
  })

  test.prop([fc.plainYear()])('toString', plainYear => {
    const actual = plainYear.toString()

    expect(_.PlainYear.from(actual)).toStrictEqual(plainYear)
  })
})

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

describe('PlainYearInTupleSchema', () => {
  describe('decoding', () => {
    test.prop([fc.plainYear()])('with date parts', plainYear => {
      const actual = Schema.decodeUnknownSync(_.PlainYearInTupleSchema)([plainYear.year])

      expect(actual).toStrictEqual(plainYear)
    })

    test.prop([
      fc.oneof(
        fc.anything().filter(value => !Array.isArray(value)),
        fc.array(fc.anything().filter(value => typeof value !== 'number' || value < -271820 || value > 275760)),
        fc.nonEmptyArray(fc.integer(), { minLength: 2 }),
      ),
    ])('with non-date parts', value => {
      const actual = Schema.decodeUnknownEither(_.PlainYearInTupleSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.plainYear()])('encoding', plainYear => {
    const actual = Schema.encodeSync(_.PlainYearInTupleSchema)(plainYear)

    expect(actual).toStrictEqual([plainYear.year])
  })
})

describe('PlainYearMonthInTupleSchema', () => {
  describe('decoding', () => {
    test.prop([fc.plainYearMonth()])('with date parts', plainYearMonth => {
      const actual = Schema.decodeUnknownSync(_.PlainYearMonthInTupleSchema)([
        plainYearMonth.year,
        plainYearMonth.month,
      ])

      expect(actual).toStrictEqual(plainYearMonth)
    })

    test.prop([
      fc.oneof(
        fc.anything().filter(value => !Array.isArray(value)),
        fc.array(fc.anything().filter(value => typeof value !== 'number' || !Number.isSafeInteger(value))),
        fc.tuple(fc.integer(), fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 13 }))),
        fc.nonEmptyArray(fc.integer(), { maxLength: 1 }),
        fc.nonEmptyArray(fc.integer(), { minLength: 3 }),
      ),
    ])('with non-date parts', value => {
      const actual = Schema.decodeUnknownEither(_.PlainYearMonthInTupleSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.plainYearMonth()])('encoding', plainYearMonth => {
    const actual = Schema.encodeSync(_.PlainYearMonthInTupleSchema)(plainYearMonth)

    expect(actual).toStrictEqual([plainYearMonth.year, plainYearMonth.month])
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
        fc.array(fc.anything().filter(value => typeof value !== 'number' || !Number.isSafeInteger(value))),
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
