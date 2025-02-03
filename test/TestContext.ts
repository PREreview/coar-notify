import { FetchHttpClient } from '@effect/platform'
import { Context, Effect, Layer, TestContext as _TestContext } from 'effect'
import fetchMock from 'fetch-mock'

export class FetchMock extends Context.Tag('test/FetchMock')<FetchMock, fetchMock.FetchMockSandbox>() {}

export const TestHttpClient = FetchHttpClient.layer.pipe(
  Layer.provideMerge(
    Layer.effect(
      FetchHttpClient.Fetch,
      Effect.gen(function* (_) {
        const fetchMock = yield* _(FetchMock)

        return (input, init) => fetchMock(input instanceof URL ? input.href : input, init)
      }),
    ),
  ),
  Layer.provideMerge(Layer.sync(FetchMock, () => fetchMock.sandbox())),
)

export const TestContext = _TestContext.TestContext
