import { ParseResult, Schema } from '@effect/schema'

export const UrlFromSelfSchema: Schema.Schema<URL> = Schema.instanceOf(URL)

export const UrlFromStringSchema = <A extends string, I, R>(self: Schema.Schema<A, I, R>): Schema.Schema<URL, I, R> =>
  Schema.transformOrFail(
    self,
    UrlFromSelfSchema,
    (s, _, ast) =>
      ParseResult.try({
        try: () => new URL(s),
        catch: () => new ParseResult.Type(ast, s),
      }),
    url => ParseResult.succeed(url.href),
    { strict: false },
  )

export const UrlSchema = UrlFromStringSchema(Schema.string)
