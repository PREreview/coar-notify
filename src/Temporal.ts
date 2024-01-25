import { ParseResult, Schema } from '@effect/schema'
import { Temporal } from '@js-temporal/polyfill'
import { Clock, Effect } from 'effect'

export const InstantFromSelfSchema = Schema.instanceOf(Temporal.Instant)

export const Timestamp = Clock.currentTimeMillis.pipe(Effect.map(n => Temporal.Instant.fromEpochMilliseconds(n)))

export const InstantFromMillisecondsSchema = <R, I, A extends number>(
  self: Schema.Schema<R, I, A>,
): Schema.Schema<R, I, Temporal.Instant> =>
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
