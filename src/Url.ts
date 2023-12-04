import { ParseResult, Schema } from '@effect/schema'

export const UrlSchema: Schema.Schema<URL> = Schema.instanceOf(URL)

export const UrlFromStringSchema = <I, A extends string>(self: Schema.Schema<I, A>): Schema.Schema<I, URL> =>
  Schema.transformOrFail(
    self,
    UrlSchema,
    (s, _, ast) =>
      ParseResult.try({
        try: () => new URL(s),
        catch: () => ParseResult.parseError([ParseResult.type(ast, s)]),
      }),
    url => ParseResult.succeed(url.href),
    { strict: false },
  )
