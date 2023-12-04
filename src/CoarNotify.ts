import { Schema } from '@effect/schema'

export const ReviewActionSchema = Schema.struct({
  '@context': Schema.tuple(
    Schema.literal('https://www.w3.org/ns/activitystreams'),
    Schema.literal('https://purl.org/coar/notify'),
  ),
  id: Schema.string,
})
