import { ParseResult, Schema } from '@effect/schema'
import doiRegex from 'doi-regex'
import { Brand, Either, type Option, type Predicate, String, flow } from 'effect'

export type Doi = Brand.Branded<string, 'Doi'>

const isDoi: Predicate.Refinement<unknown, Doi> = (u): u is Doi =>
  typeof u === 'string' && doiRegex({ exact: true }).test(u) && !u.endsWith('/.') && !u.endsWith('/..')

export const Doi = Brand.refined<Doi>(isDoi, s => Brand.error(`Expected ${s} to be a DOI`))

export const toUrl: (doi: Doi) => URL = doi => {
  const url = new URL('https://doi.org')
  url.pathname = doi.replace(/\/(\.{1,2})\//g, '/$1%2F').replace(/\\/g, '%5C')

  return url
}

const parse: (s: string) => Option.Option<Doi> = flow(
  String.trim,
  String.replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:)?/i, ''),
  s => Doi.option(s),
)

export const DoiSchema = Schema.string.pipe(Schema.fromBrand(Doi))

export const DoiUrlSchema: Schema.Schema<Doi, string> = Schema.transformOrFail(
  Schema.string,
  Schema.to(DoiSchema),
  s => Either.fromOption(parse(s), () => ParseResult.type(DoiSchema.ast, s)),
  doi => ParseResult.succeed(toUrl(doi).href),
)
