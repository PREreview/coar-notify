import { Temporal } from '@js-temporal/polyfill'
import { Clock, Effect, ParseResult, Schema, Tuple } from 'effect'

export const { Instant, PlainDate, PlainYearMonth } = Temporal

export type Instant = Temporal.Instant
export type PlainDate = Temporal.PlainDate
export type PlainYearMonth = Temporal.PlainYearMonth

export class PlainYear {
  private readonly internal: Temporal.PlainYearMonth
  readonly year: number

  constructor(isoYear: number, calendar?: string, referenceISODay?: number) {
    this.internal = new Temporal.PlainYearMonth(isoYear, 1, calendar, referenceISODay)
    this.year = this.internal.year
  }

  static from(item: string | { year: number }, options?: Temporal.AssignmentOptions) {
    if (typeof item === 'string') {
      if (!/^[+\u2212-]\d{6}|\d{4}$/.test(item)) {
        throw new TypeError(`invalid year ${item}`)
      }

      return new PlainYear(Temporal.PlainYearMonth.from(`${item}-01`, options).year)
    }

    return new PlainYear(Temporal.PlainYearMonth.from({ ...item, month: 1 }, options).year)
  }

  toString(): string {
    if (this.year < 0 || this.year > 9999) {
      const sign = this.year < 0 ? '-' : '+'
      const yearNumber = Math.abs(this.year)
      return sign + `000000${yearNumber}`.slice(-6)
    }

    return `0000${this.year}`.slice(-4)
  }
}

export const InstantFromSelfSchema = Schema.instanceOf(Temporal.Instant)

export const PlainYearFromSelfSchema = Schema.instanceOf(PlainYear)

export const PlainYearMonthFromSelfSchema = Schema.instanceOf(Temporal.PlainYearMonth)

export const PlainDateFromSelfSchema = Schema.instanceOf(Temporal.PlainDate)

export const Timestamp = Clock.currentTimeMillis.pipe(Effect.map(n => Temporal.Instant.fromEpochMilliseconds(n)))

export const InstantFromMillisecondsSchema = Schema.transformOrFail(Schema.Number, InstantFromSelfSchema, {
  decode: (number, _, ast) =>
    ParseResult.try({
      try: () => Temporal.Instant.fromEpochMilliseconds(number),
      catch: () => new ParseResult.Type(ast, number),
    }),
  encode: instant => ParseResult.succeed(instant.epochMilliseconds),
})

export const InstantFromStringSchema: Schema.Schema<Instant, string> = Schema.transformOrFail(
  Schema.String,
  InstantFromSelfSchema,
  {
    decode: (date, _, ast) =>
      ParseResult.try({
        try: () => Instant.from(date),
        catch: () => new ParseResult.Type(ast, date),
      }),
    encode: instant => ParseResult.succeed(instant.toString()),
  },
)

export const PlainYearFromTupleSchema: Schema.Schema<PlainYear, readonly [number]> = Schema.transformOrFail(
  Schema.Tuple(Schema.Number),
  PlainYearFromSelfSchema,
  {
    decode: ([year], _, ast) =>
      ParseResult.try({
        try: () => PlainYear.from({ year }, { overflow: 'reject' }),
        catch: () => new ParseResult.Type(ast, [year]),
      }),
    encode: plainYear => ParseResult.succeed(Tuple.make(plainYear.year)),
  },
)

export const PlainYearFromStringSchema: Schema.Schema<PlainYear, string> = Schema.transformOrFail(
  Schema.String,
  PlainYearFromSelfSchema,
  {
    decode: (date, _, ast) =>
      ParseResult.try({
        try: () => PlainYear.from(date, { overflow: 'reject' }),
        catch: () => new ParseResult.Type(ast, date),
      }),
    encode: plainYear => ParseResult.succeed(plainYear.toString()),
  },
)

export const PlainYearMonthFromTupleSchema: Schema.Schema<Temporal.PlainYearMonth, readonly [number, number]> =
  Schema.transformOrFail(Schema.Tuple(Schema.Number, Schema.Number), PlainYearMonthFromSelfSchema, {
    decode: ([year, month], _, ast) =>
      ParseResult.try({
        try: () => Temporal.PlainYearMonth.from({ year, month }, { overflow: 'reject' }),
        catch: () => new ParseResult.Type(ast, [year, month]),
      }),
    encode: plainYearMonth => ParseResult.succeed(Tuple.make(plainYearMonth.year, plainYearMonth.month)),
  })

export const PlainYearMonthFromStringSchema: Schema.Schema<Temporal.PlainYearMonth, string> = Schema.transformOrFail(
  Schema.String,
  PlainYearMonthFromSelfSchema,
  {
    decode: (date, _, ast) =>
      ParseResult.try({
        try: () => Temporal.PlainYearMonth.from(date, { overflow: 'reject' }),
        catch: () => new ParseResult.Type(ast, date),
      }),
    encode: plainYearMonth => ParseResult.succeed(plainYearMonth.toString()),
  },
)

export const PlainDateFromTupleSchema: Schema.Schema<Temporal.PlainDate, readonly [number, number, number]> =
  Schema.transformOrFail(Schema.Tuple(Schema.Number, Schema.Number, Schema.Number), PlainDateFromSelfSchema, {
    decode: ([year, month, day], _, ast) =>
      ParseResult.try({
        try: () => Temporal.PlainDate.from({ year, month, day }, { overflow: 'reject' }),
        catch: () => new ParseResult.Type(ast, [year, month, day]),
      }),
    encode: plainDate => ParseResult.succeed(Tuple.make(plainDate.year, plainDate.month, plainDate.day)),
  })

export const PlainDateFromStringSchema: Schema.Schema<Temporal.PlainDate, string> = Schema.transformOrFail(
  Schema.String,
  PlainDateFromSelfSchema,
  {
    decode: (date, _, ast) =>
      ParseResult.try({
        try: () => Temporal.PlainDate.from(date, { overflow: 'reject' }),
        catch: () => new ParseResult.Type(ast, date),
      }),
    encode: plainDate => ParseResult.succeed(plainDate.toString()),
  },
)
