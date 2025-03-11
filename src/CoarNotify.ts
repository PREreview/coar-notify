import { Schema } from 'effect'
import * as Doi from './Doi.js'
import * as Url from './Url.js'

export type RequestReview = Schema.Schema.Type<typeof RequestReviewSchema>

export const RequestReviewSchema = Schema.Struct({
  '@context': Schema.Tuple(
    [
      Schema.Literal('https://www.w3.org/ns/activitystreams'),
      Schema.Literal('https://coar-notify.net', 'https://purl.org/coar/notify'),
    ],
    Schema.String,
  ),
  id: Schema.String,
  type: Schema.Tuple(Schema.Literal('Offer'), Schema.Literal('coar-notify:ReviewAction')),
  origin: Schema.Struct({
    id: Url.UrlFromStringSchema,
    inbox: Schema.optionalWith(Url.UrlFromStringSchema, { exact: true }),
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
    name: Schema.NonEmptyTrimmedString,
  }),
})

export type AnnounceReview = Schema.Schema.Type<typeof AnnounceReviewSchema>

export const AnnounceReviewSchema = Schema.Struct({
  '@context': Schema.Tuple(
    Schema.Literal('https://www.w3.org/ns/activitystreams'),
    Schema.Literal('https://coar-notify.net'),
  ),
  id: Url.UrlFromStringSchema,
  type: Schema.Tuple(Schema.Literal('Announce'), Schema.Literal('coar-notify:ReviewAction')),
  origin: Schema.Struct({
    id: Url.UrlFromStringSchema,
    inbox: Url.UrlFromStringSchema,
    type: Schema.Literal('Service'),
  }),
  target: Schema.Struct({
    id: Url.UrlFromStringSchema,
    inbox: Url.UrlFromStringSchema,
    type: Schema.Literal('Service'),
  }),
  context: Schema.Struct({
    id: Url.UrlFromStringSchema,
    'ietf:cite-as': Doi.DoiFromUrlSchema,
  }),
  object: Schema.Struct({
    id: Url.UrlFromStringSchema,
    'ietf:cite-as': Doi.DoiFromUrlSchema,
    type: Schema.Tuple(Schema.Literal('Page'), Schema.Literal('sorg:Review')),
  }),
})
