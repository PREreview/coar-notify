import { test } from '@fast-check/vitest'
import { Effect, Either, Number as Number_, Option, Schema, TestClock, TestContext } from 'effect'
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
            fc.string({ unit: 'grapheme' }).filter(s => Option.isNone(Number_.parse(s))),
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

describe('InstantFromMillisecondsSchema', () => {
  describe('decoding', () => {
    test.prop([fc.epochMilliseconds()])('with milliseconds', epochMilliseconds => {
      const actual = Schema.decodeUnknownSync(_.InstantFromMillisecondsSchema)(epochMilliseconds)

      expect(actual.epochMilliseconds).toStrictEqual(epochMilliseconds)
    })

    test.prop([fc.anything().filter(value => typeof value !== 'number' || !Number.isInteger(value))])(
      'with non-milliseconds',
      value => {
        const actual = Schema.decodeUnknownEither(_.InstantFromMillisecondsSchema)(value)

        expect(actual).toStrictEqual(Either.left(expect.anything()))
      },
    )
  })

  test.prop([fc.instant()])('encoding', instant => {
    const actual = Schema.encodeSync(_.InstantFromMillisecondsSchema)(instant)

    expect(actual).toStrictEqual(instant.epochMilliseconds)
  })
})

describe('InstantFromStringSchema', () => {
  describe('decoding', () => {
    test.prop([fc.instant()])('with an instant', instant => {
      const actual = Schema.decodeUnknownSync(_.InstantFromStringSchema)(instant.toString())

      expect(actual).toStrictEqual(instant)
    })

    test.prop([fc.anything().filter(value => typeof value !== 'string' || Number.isNaN(Date.parse(value)))])(
      'with a non-instant',
      value => {
        const actual = Schema.decodeUnknownEither(_.InstantFromStringSchema)(value)

        expect(actual).toStrictEqual(Either.left(expect.anything()))
      },
    )
  })

  test.prop([fc.instant()])('encoding', instant => {
    const actual = Schema.encodeSync(_.InstantFromStringSchema)(instant)

    expect(actual).toStrictEqual(instant.toString())
  })
})

describe('PlainYearFromTupleSchema', () => {
  describe('decoding', () => {
    test.prop([fc.plainYear()])('with date parts', plainYear => {
      const actual = Schema.decodeUnknownSync(_.PlainYearFromTupleSchema)([plainYear.year])

      expect(actual).toStrictEqual(plainYear)
    })

    test.prop([
      fc.oneof(
        fc.anything().filter(value => !Array.isArray(value)),
        fc.array(fc.anything().filter(value => typeof value !== 'number' || value < -271820 || value > 275760)),
        fc.nonEmptyArray(fc.integer(), { minLength: 2 }),
      ),
    ])('with non-date parts', value => {
      const actual = Schema.decodeUnknownEither(_.PlainYearFromTupleSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.plainYear()])('encoding', plainYear => {
    const actual = Schema.encodeSync(_.PlainYearFromTupleSchema)(plainYear)

    expect(actual).toStrictEqual([plainYear.year])
  })
})

describe('PlainYearFromStringSchema', () => {
  describe('decoding', () => {
    test.prop([fc.plainYear()])('with a year', plainYear => {
      const actual = Schema.decodeUnknownSync(_.PlainYearFromStringSchema)(plainYear.toString())

      expect(actual).toStrictEqual(plainYear)
    })

    test.prop([
      fc
        .anything()
        .filter(value => typeof value !== 'string' || Either.isLeft(Either.try(() => _.PlainYear.from(value)))),
    ])('with a non-year', value => {
      const actual = Schema.decodeUnknownEither(_.PlainYearFromStringSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.plainYear()])('encoding', plainYear => {
    const actual = Schema.encodeSync(_.PlainYearFromStringSchema)(plainYear)

    expect(actual).toStrictEqual(plainYear.toString())
  })
})

describe('PlainYearMonthFromTupleSchema', () => {
  describe('decoding', () => {
    test.prop([fc.plainYearMonth()])('with date parts', plainYearMonth => {
      const actual = Schema.decodeUnknownSync(_.PlainYearMonthFromTupleSchema)([
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
      const actual = Schema.decodeUnknownEither(_.PlainYearMonthFromTupleSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.plainYearMonth()])('encoding', plainYearMonth => {
    const actual = Schema.encodeSync(_.PlainYearMonthFromTupleSchema)(plainYearMonth)

    expect(actual).toStrictEqual([plainYearMonth.year, plainYearMonth.month])
  })
})

describe('PlainYearMonthFromStringSchema', () => {
  describe('decoding', () => {
    test.prop([fc.plainYearMonth()])('with a year-month', plainYearMonth => {
      const actual = Schema.decodeUnknownSync(_.PlainYearMonthFromStringSchema)(plainYearMonth.toString())

      expect(actual).toStrictEqual(plainYearMonth)
    })

    test.prop([
      fc
        .anything()
        .filter(value => typeof value !== 'string' || Either.isLeft(Either.try(() => _.PlainYearMonth.from(value)))),
    ])('with non-date parts', value => {
      const actual = Schema.decodeUnknownEither(_.PlainYearMonthFromStringSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.plainYearMonth()])('encoding', plainYearMonth => {
    const actual = Schema.encodeSync(_.PlainYearMonthFromStringSchema)(plainYearMonth)

    expect(actual).toStrictEqual(plainYearMonth.toString())
  })
})

describe('PlainDateFromTupleSchema', () => {
  describe('decoding', () => {
    test.prop([fc.plainDate()])('with date parts', plainDate => {
      const actual = Schema.decodeUnknownSync(_.PlainDateFromTupleSchema)([
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
      const actual = Schema.decodeUnknownEither(_.PlainDateFromTupleSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.plainDate()])('encoding', plainDate => {
    const actual = Schema.encodeSync(_.PlainDateFromTupleSchema)(plainDate)

    expect(actual).toStrictEqual([plainDate.year, plainDate.month, plainDate.day])
  })
})

describe('PlainDateFromStringSchema', () => {
  describe('decoding', () => {
    test.prop([fc.plainDate()])('with a plain date', plainDate => {
      const actual = Schema.decodeUnknownSync(_.PlainDateFromStringSchema)(plainDate.toString())

      expect(actual).toStrictEqual(plainDate)
    })

    test.prop([
      fc
        .anything()
        .filter(value => typeof value !== 'string' || Either.isLeft(Either.try(() => _.PlainYearMonth.from(value)))),
    ])('with a non-date', value => {
      const actual = Schema.decodeUnknownEither(_.PlainDateFromStringSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  test.prop([fc.plainDate()])('encoding', plainDate => {
    const actual = Schema.encodeSync(_.PlainDateFromStringSchema)(plainDate)

    expect(actual).toStrictEqual(plainDate.toString())
  })
})
