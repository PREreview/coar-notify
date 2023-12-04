import { ParseResult, Schema } from '@effect/schema'
import { Temporal } from '@js-temporal/polyfill'
import { Clock, Effect } from 'effect'

export const InstantSchema = Schema.instanceOf(Temporal.Instant)

export const Timestamp = Clock.currentTimeMillis.pipe(Effect.map(n => Temporal.Instant.fromEpochMilliseconds(n)))

export const InstantFromMillisecondsSchema = <I, A extends number>(
  self: Schema.Schema<I, A>,
): Schema.Schema<I, Temporal.Instant> =>
  Schema.transformOrFail(
    self,
    InstantSchema,
    (number, _, ast) =>
      ParseResult.try({
        try: () => Temporal.Instant.fromEpochMilliseconds(number),
        catch: () => ParseResult.parseError([ParseResult.type(ast, number)]),
      }),
    instant => ParseResult.succeed(instant.epochMilliseconds),
    { strict: false },
  )
