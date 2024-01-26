import { ParseResult, Schema } from '@effect/schema'

export const UrlFromSelfSchema: Schema.Schema<never, URL> = Schema.instanceOf(URL)

export const UrlFromStringSchema = <R, I, A extends string>(self: Schema.Schema<R, I, A>): Schema.Schema<R, I, URL> =>
  Schema.transformOrFail(
    self,
    UrlFromSelfSchema,
    (s, _, ast) =>
      ParseResult.try({
        try: () => new URL(s),
        catch: () => ParseResult.type(ast, s),
      }),
    url => ParseResult.succeed(url.href),
    { strict: false },
  )

export const UrlSchema = UrlFromStringSchema(Schema.string)
