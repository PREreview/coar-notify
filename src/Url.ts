import { ParseResult, Schema } from '@effect/schema'

export const UrlFromSelfSchema: Schema.Schema<URL> = Schema.instanceOf(URL)

export const UrlSchema = Schema.transformOrFail(Schema.String, UrlFromSelfSchema, {
  decode: (s, _, ast) =>
    ParseResult.try({
      try: () => new URL(s),
      catch: () => new ParseResult.Type(ast, s),
    }),
  encode: url => ParseResult.succeed(url.href),
})
