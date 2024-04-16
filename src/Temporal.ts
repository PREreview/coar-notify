import { ParseResult, Schema } from '@effect/schema'
import { Temporal } from '@js-temporal/polyfill'
import { Clock, Effect } from 'effect'

export const { Instant, PlainDate, PlainYearMonth } = Temporal

export type Instant = Temporal.Instant
export type PlainDate = Temporal.PlainDate
export type PlainYearMonth = Temporal.PlainYearMonth

export class PlainYear {
  private readonly internal: Temporal.PlainYearMonth
  readonly year: number

  constructor(isoYear: number, calendar?: Temporal.CalendarLike, referenceISODay?: number) {
    this.internal = new Temporal.PlainYearMonth(isoYear, 1, calendar, referenceISODay)
    this.year = this.internal.year
  }

  static from(item: { year: number }, options?: Temporal.AssignmentOptions) {
    return new PlainYear(Temporal.PlainYearMonth.from({ ...item, month: 1 }, options).getISOFields().isoYear)
  }
}

export const InstantFromSelfSchema = Schema.instanceOf(Temporal.Instant)

export const PlainYearFromSelfSchema = Schema.instanceOf(PlainYear)

export const PlainYearMonthFromSelfSchema = Schema.instanceOf(Temporal.PlainYearMonth)

export const PlainDateFromSelfSchema = Schema.instanceOf(Temporal.PlainDate)

export const Timestamp = Clock.currentTimeMillis.pipe(Effect.map(n => Temporal.Instant.fromEpochMilliseconds(n)))

export const InstantFromMillisecondsSchema = <A extends number, I, R>(
  self: Schema.Schema<A, I, R>,
): Schema.Schema<Temporal.Instant, I, R> =>
  Schema.transformOrFail(self, InstantFromSelfSchema, {
    decode: (number, _, ast) =>
      ParseResult.try({
        try: () => Temporal.Instant.fromEpochMilliseconds(number),
        catch: () => new ParseResult.Type(ast, number),
      }),
    encode: instant => ParseResult.succeed(instant.epochMilliseconds),
    strict: false,
  })

export const InstantInMillisecondsSchema = InstantFromMillisecondsSchema(Schema.Number)

export const PlainYearInTupleSchema: Schema.Schema<PlainYear, readonly [number]> = Schema.transformOrFail(
  Schema.Tuple(Schema.Number),
  PlainYearFromSelfSchema,
  {
    decode: ([year], _, ast) =>
      ParseResult.try({
        try: () => PlainYear.from({ year }, { overflow: 'reject' }),
        catch: () => new ParseResult.Type(ast, [year]),
      }),
    encode: plainYear => ParseResult.succeed([plainYear.year]),
    strict: false,
  },
)

export const PlainYearMonthInTupleSchema: Schema.Schema<Temporal.PlainYearMonth, readonly [number, number]> =
  Schema.transformOrFail(Schema.Tuple(Schema.Number, Schema.Number), PlainYearMonthFromSelfSchema, {
    decode: ([year, month], _, ast) =>
      ParseResult.try({
        try: () => Temporal.PlainYearMonth.from({ year, month }, { overflow: 'reject' }),
        catch: () => new ParseResult.Type(ast, [year, month]),
      }),
    encode: plainYearMonth => ParseResult.succeed([plainYearMonth.year, plainYearMonth.month]),
    strict: false,
  })

export const PlainDateInTupleSchema: Schema.Schema<Temporal.PlainDate, readonly [number, number, number]> =
  Schema.transformOrFail(Schema.Tuple(Schema.Number, Schema.Number, Schema.Number), PlainDateFromSelfSchema, {
    decode: ([year, month, day], _, ast) =>
      ParseResult.try({
        try: () => Temporal.PlainDate.from({ year, month, day }, { overflow: 'reject' }),
        catch: () => new ParseResult.Type(ast, [year, month, day]),
      }),
    encode: plainDate => ParseResult.succeed([plainDate.year, plainDate.month, plainDate.day]),
    strict: false,
  })
