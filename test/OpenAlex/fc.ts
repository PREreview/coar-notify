import type { HttpClientError } from '@effect/platform'
import type { ParseResult } from 'effect'
import { GetWorkError, ListWorksError } from '../../src/OpenAlex/OpenAlexApi.js'
import * as fc from '../fc.js'

export * from '../fc.js'

export const openAlexGetWorkError = ({
  cause,
}: {
  cause?: fc.Arbitrary<HttpClientError.HttpClientError | ParseResult.ParseError>
} = {}): fc.Arbitrary<GetWorkError> =>
  fc
    .record({
      cause: cause ?? fc.constant(undefined),
      message: fc.string(),
    })
    .map(args =>
      Object.defineProperties(new GetWorkError(args), {
        [fc.toStringMethod]: { value: () => fc.stringify(args) },
      }),
    )

export const openAlexListWorksError = ({
  cause,
}: {
  cause?: fc.Arbitrary<HttpClientError.HttpClientError | ParseResult.ParseError>
} = {}): fc.Arbitrary<ListWorksError> =>
  fc
    .record({
      cause: cause ?? fc.constant(undefined),
      message: fc.string(),
    })
    .map(args =>
      Object.defineProperties(new ListWorksError(args), {
        [fc.toStringMethod]: { value: () => fc.stringify(args) },
      }),
    )
