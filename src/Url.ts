import { ParseResult, Schema } from 'effect'

export const UrlFromSelfSchema: Schema.Schema<URL> = Schema.instanceOf(URL)

export const UrlFromStringSchema = Schema.transformOrFail(Schema.String, UrlFromSelfSchema, {
  decode: (s, _, ast) =>
    ParseResult.try({
      try: () => new URL(s),
      catch: () => new ParseResult.Type(ast, s),
    }),
  encode: url => ParseResult.succeed(url.href),
})
