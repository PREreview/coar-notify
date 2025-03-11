import { test } from '@fast-check/vitest'
import { ParseResult } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../src/CoarNotify.js'
import * as Doi from '../src/Doi.js'
import * as fc from './fc.js'

describe('RequestReviewSchema', () => {
  test.prop([fc.trimmedString({ minLength: 1 })])('accepts valid input', name => {
    expect(
      ParseResult.decodeUnknownSync(_.RequestReviewSchema)({
        '@context': ['https://www.w3.org/ns/activitystreams', 'https://purl.org/coar/notify', 'http://schema.org/'],
        actor: {
          id: 'https://orcid.org/0000-0002-1825-0097',
          name,
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
        name,
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

  test.prop([
    fc
      .record(
        {
          target: fc.record(
            {
              id: fc.anything(),
              inbox: fc.anything(),
              type: fc.anything(),
            },
            { requiredKeys: [] },
          ),
          actor: fc.record(
            {
              id: fc.string(),
              name: fc.untrimmedString(),
              type: fc.string(),
            },
            { requiredKeys: [] },
          ),
        },
        { requiredKeys: [] },
      )
      .filter(input => Object.keys(input).length > 0),
  ])('rejects invalid input', input => {
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
          inbox: 'https://review-service.org/inbox',
          type: 'Service',
        },
        type: ['Offer', 'coar-notify:ReviewAction'],
        updated: '2022-10-06T15:00:00.000000',
        ...input,
      }),
    ).toThrow()
  })
})

describe('AnnounceReviewSchema', () => {
  test('accepts valid input', () => {
    expect(
      ParseResult.decodeUnknownSync(_.AnnounceReviewSchema)({
        '@context': ['https://www.w3.org/ns/activitystreams', 'https://coar-notify.net'],
        id: 'urn:uuid:572b8e81-d92f-4ed5-8178-cc7f04f44cd1',
        context: {
          id: 'https://research-organisation.org/repository/preprint/201203/421/',
          'ietf:cite-as': 'https://doi.org/10.5555/12345680',
          type: 'sorg:AboutPage',
          'ietf:item': {
            id: 'https://research-organisation.org/repository/preprint/201203/421/content.pdf',
            mediaType: 'application/pdf',
            type: ['Article', 'sorg:ScholarlyArticle'],
          },
        },
        object: {
          id: 'https://review-service.com/review/geo/202103/0021',
          'ietf:cite-as': 'https://doi.org/10.3214/987654',
          type: ['Page', 'sorg:Review'],
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
        type: ['Announce', 'coar-notify:ReviewAction'],
      }),
    ).toStrictEqual({
      '@context': ['https://www.w3.org/ns/activitystreams', 'https://coar-notify.net'],
      id: new URL('urn:uuid:572b8e81-d92f-4ed5-8178-cc7f04f44cd1'),
      context: {
        id: new URL('https://research-organisation.org/repository/preprint/201203/421/'),
        'ietf:cite-as': Doi.Doi('10.5555/12345680'),
      },
      object: {
        id: new URL('https://review-service.com/review/geo/202103/0021'),
        'ietf:cite-as': Doi.Doi('10.3214/987654'),
        type: ['Page', 'sorg:Review'],
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
      type: ['Announce', 'coar-notify:ReviewAction'],
    })
  })
})
