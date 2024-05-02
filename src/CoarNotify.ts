import { Schema } from '@effect/schema'
import * as Doi from './Doi.js'
import * as Url from './Url.js'

export type RequestReview = Schema.Schema.Type<typeof RequestReviewSchema>

export const RequestReviewSchema = Schema.Struct({
  '@context': Schema.Tuple(
    [Schema.Literal('https://www.w3.org/ns/activitystreams'), Schema.Literal('https://purl.org/coar/notify')],
    Schema.String,
  ),
  id: Schema.String,
  type: Schema.Tuple(Schema.Literal('Offer'), Schema.Literal('coar-notify:ReviewAction')),
  origin: Schema.Struct({
    id: Url.UrlFromStringSchema,
    inbox: Url.UrlFromStringSchema,
    type: Schema.Literal('Organization', 'Service'),
  }),
  target: Schema.Struct({
    id: Url.UrlFromStringSchema,
    inbox: Url.UrlFromStringSchema,
    type: Schema.Literal('Organization', 'Service'),
  }),
  object: Schema.Struct({
    id: Schema.String,
    'ietf:cite-as': Doi.DoiFromUrlSchema,
  }),
  actor: Schema.Struct({
    id: Url.UrlFromStringSchema,
    type: Schema.Literal('Application', 'Group', 'Organization', 'Person', 'Service'),
    name: Schema.String.pipe(Schema.trimmed(), Schema.nonEmpty()),
  }),
})
