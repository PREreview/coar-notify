import { ParseResult } from '@effect/schema'
import { describe, expect, test } from 'vitest'
import * as _ from '../src/CoarNotify.js'
import * as Doi from '../src/Doi.js'

describe('RequestReviewSchema', () => {
  test('accepts valid input', () => {
    expect(
      ParseResult.decodeUnknownSync(_.RequestReviewSchema)({
        '@context': ['https://www.w3.org/ns/activitystreams', 'https://purl.org/coar/notify', 'http://schema.org/'],
        actor: {
          id: 'https://orcid.org/0000-0002-1825-0097',
          name: 'Josiah Carberry',
          type: 'Person',
        },
        id: 'urn:uuid:572b8e81-d92f-4ed5-8178-cc7f04f44cd1',
        object: {
          id: 'https://research-organisation.org/repository/preprint/201203/421/',
          'ietf:cite-as': 'https://doi.org/10.5555/12345680',
          type: 'sorg:AboutPage',
          url: {
            id: 'https://research-organisation.org/repository/preprint/201203/421/content.pdf',
            mediaType: 'application/pdf',
            type: ['Article', 'sorg:ScholarlyArticle'],
          },
        },
        origin: {
          id: 'https://research-organisation.org/repository',
          inbox: 'https://research-organisation.org/inbox/',
          type: 'Service',
        },
        target: {
          id: 'https://review-service.org/',
          inbox: 'https://review-service.org/inbox',
          type: 'Service',
        },
        type: ['Offer', 'coar-notify:ReviewAction'],
        updated: '2022-10-06T15:00:00.000000',
      }),
    ).toStrictEqual({
      '@context': ['https://www.w3.org/ns/activitystreams', 'https://purl.org/coar/notify', 'http://schema.org/'],
      actor: {
        id: new URL('https://orcid.org/0000-0002-1825-0097'),
        name: 'Josiah Carberry',
        type: 'Person',
      },
      id: 'urn:uuid:572b8e81-d92f-4ed5-8178-cc7f04f44cd1',
      object: {
        id: 'https://research-organisation.org/repository/preprint/201203/421/',
        'ietf:cite-as': Doi.Doi('10.5555/12345680'),
      },
      origin: {
        id: new URL('https://research-organisation.org/repository'),
        inbox: new URL('https://research-organisation.org/inbox/'),
        type: 'Service',
      },
      target: {
        id: new URL('https://review-service.org/'),
        inbox: new URL('https://review-service.org/inbox'),
        type: 'Service',
      },
      type: ['Offer', 'coar-notify:ReviewAction'],
    })
  })

  test('rejects invalid input', () => {
    expect(() =>
      ParseResult.decodeUnknownSync(_.RequestReviewSchema)({
        '@context': ['https://www.w3.org/ns/activitystreams', 'https://purl.org/coar/notify'],
        actor: {
          id: 'https://orcid.org/0000-0002-1825-0097',
          name: 'Josiah Carberry',
          type: 'Person',
        },
        id: 'urn:uuid:572b8e81-d92f-4ed5-8178-cc7f04f44cd1',
        object: {
          id: 'https://research-organisation.org/repository/preprint/201203/421/',
          'ietf:cite-as': 'https://doi.org/10.5555/12345680',
          type: 'sorg:AboutPage',
          url: {
            id: 'https://research-organisation.org/repository/preprint/201203/421/content.pdf',
            mediaType: 'application/pdf',
            type: ['Article', 'sorg:ScholarlyArticle'],
          },
        },
        origin: {
          id: 'https://research-organisation.org/repository',
          inbox: 'https://research-organisation.org/inbox/',
          type: 'Service',
        },
        target: {
          id: 'https://review-service.org/',
          type: 'Service',
        },
        type: ['Offer', 'coar-notify:ReviewAction'],
        updated: '2022-10-06T15:00:00.000000',
      }),
    ).toThrow()
  })
})
