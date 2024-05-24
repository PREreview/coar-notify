import { Schema } from '@effect/schema'
import type { Predicate } from 'effect'
import iso6391, { type LanguageCode } from 'iso-639-1'

export { type LanguageCode } from 'iso-639-1'

export const isLanguageCode: Predicate.Refinement<unknown, LanguageCode> = (u): u is LanguageCode =>
  typeof u === 'string' && iso6391.validate(u)

export const LanguageCodeSchema: Schema.Schema<LanguageCode, string> = Schema.String.pipe(Schema.filter(isLanguageCode))
