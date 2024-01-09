import { ParseResult, Schema } from '@effect/schema'

export const UrlFromSelfSchema: Schema.Schema<URL> = Schema.instanceOf(URL)

export const UrlFromStringSchema = <I, A extends string>(self: Schema.Schema<I, A>): Schema.Schema<I, URL> =>
  Schema.transformOrFail(
    self,
    UrlFromSelfSchema,
    (s, _, ast) =>
      ParseResult.try({
        try: () => new URL(s),
        catch: () => ParseResult.parseError(ParseResult.type(ast, s)),
      }),
    url => ParseResult.succeed(url.href),
    { strict: false },
  )

export const UrlSchema = UrlFromStringSchema(Schema.string)
