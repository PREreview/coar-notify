import { Schema } from '@effect/schema'
import * as Doi from './Doi.js'
import * as Url from './Url.js'

export type RequestReview = Schema.Schema.To<typeof RequestReviewSchema>

export const RequestReviewSchema = Schema.struct({
  '@context': Schema.tuple(
    Schema.literal('https://www.w3.org/ns/activitystreams'),
    Schema.literal('https://purl.org/coar/notify'),
  ).pipe(Schema.rest(Schema.string)),
  id: Schema.string,
  type: Schema.tuple(Schema.literal('Offer'), Schema.literal('coar-notify:ReviewAction')),
  origin: Schema.struct({
    id: Url.UrlSchema,
    inbox: Url.UrlSchema,
    type: Schema.literal('Organization', 'Service'),
  }),
  target: Schema.struct({
    id: Url.UrlSchema,
    inbox: Url.UrlSchema,
    type: Schema.literal('Organization', 'Service'),
  }),
  object: Schema.struct({
    id: Schema.string,
    'ietf:cite-as': Doi.DoiUrlSchema,
  }),
  actor: Schema.struct({
    id: Url.UrlSchema,
    type: Schema.literal('Application', 'Group', 'Organization', 'Person', 'Service'),
    name: Schema.string,
  }),
})
