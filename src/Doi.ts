import { ParseResult, Schema } from '@effect/schema'
import { Brand, Either, Option, type Predicate, String, flow } from 'effect'

export type Doi = Brand.Branded<string, 'Doi'>

const isDoi: Predicate.Refinement<unknown, Doi> = (u): u is Doi =>
  typeof u === 'string' && /^10[.][0-9]{2,}(?:[.][0-9]+)*\/\S+$/.test(u) && !u.endsWith('/.') && !u.endsWith('/..')

export const Doi = Brand.refined<Doi>(isDoi, s => Brand.error(`Expected ${s} to be a DOI`))

export const getRegistrant = (doi: Doi): string => doi.split('/', 1)[0].slice(3)

export const hasRegistrant =
  (...registrants: ReadonlyArray<string>): Predicate.Predicate<Doi> =>
  doi =>
    registrants.includes(getRegistrant(doi))

export const toUrl: (doi: Doi) => URL = doi => {
  const url = new URL('https://doi.org')
  url.pathname = doi
    .replace(/%/g, '%25')
    .replace(/\/(\.{1,2})\//g, '/$1%2F')
    .replace(/\\/g, '%5C')

  return url
}

const parse: (s: string) => Option.Option<Doi> = flow(String.trim, s => {
  if (isDoi(s)) {
    return Option.some(s)
  }

  if (s.startsWith('doi:')) {
    return Option.liftPredicate(isDoi)(s.substring(4))
  }

  try {
    const url = new URL(s)

    if (!['http:', 'https:'].includes(url.protocol) || !['doi.org', 'dx.doi.org'].includes(url.hostname)) {
      return Option.none()
    }

    return Option.liftPredicate(isDoi)(decodeURIComponent(url.pathname).substring(1))
  } catch {
    return Option.liftPredicate(isDoi)(s)
  }
})

export const DoiSchema = Schema.String.pipe(Schema.fromBrand(Doi))

export const DoiUrlSchema: Schema.Schema<Doi, string> = Schema.transformOrFail(
  Schema.String,
  Schema.typeSchema(DoiSchema),
  {
    decode: s => Either.fromOption(parse(s), () => new ParseResult.Type(DoiSchema.ast, s)),
    encode: doi => ParseResult.succeed(toUrl(doi).href),
  },
)
