import { ParseResult, Schema } from '@effect/schema'
import { Temporal } from '@js-temporal/polyfill'
import { Clock, Effect } from 'effect'

export const { Instant, PlainDate } = Temporal

export type Instant = Temporal.Instant
export type PlainDate = Temporal.PlainDate

export const InstantFromSelfSchema = Schema.instanceOf(Temporal.Instant)

export const PlainDateFromSelfSchema = Schema.instanceOf(Temporal.PlainDate)

export const Timestamp = Clock.currentTimeMillis.pipe(Effect.map(n => Temporal.Instant.fromEpochMilliseconds(n)))

export const InstantFromMillisecondsSchema = <A extends number, I, R>(
  self: Schema.Schema<A, I, R>,
): Schema.Schema<Temporal.Instant, I, R> =>
  Schema.transformOrFail(
    self,
    InstantFromSelfSchema,
    (number, _, ast) =>
      ParseResult.try({
        try: () => Temporal.Instant.fromEpochMilliseconds(number),
        catch: () => ParseResult.type(ast, number),
      }),
    instant => ParseResult.succeed(instant.epochMilliseconds),
    { strict: false },
  )

export const InstantInMillisecondsSchema = InstantFromMillisecondsSchema(Schema.number)

export const PlainDateInTupleSchema: Schema.Schema<Temporal.PlainDate, readonly [number, number, number]> =
  Schema.transformOrFail(
    Schema.tuple(Schema.number, Schema.number, Schema.number),
    PlainDateFromSelfSchema,
    ([year, month, day], _, ast) =>
      ParseResult.try({
        try: () => Temporal.PlainDate.from({ year, month, day }, { overflow: 'reject' }),
        catch: () => ParseResult.type(ast, [year, month, day]),
      }),
    plainDate => ParseResult.succeed([plainDate.year, plainDate.month, plainDate.day]),
    { strict: false },
  )
