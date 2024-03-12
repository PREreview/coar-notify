import { HttpClient } from '@effect/platform'
import { Context, Effect, Layer, TestContext as _TestContext } from 'effect'
import fetchMock, { type FetchMockSandbox } from 'fetch-mock'

export class FetchMock extends Context.Tag('test/FetchMock')<FetchMock, FetchMockSandbox>() {}

export const TestHttpClient = HttpClient.client.layer.pipe(
  Layer.provideMerge(
    Layer.effect(
      HttpClient.client.Fetch,
      Effect.gen(function* (_) {
        const fetchMock = yield* _(FetchMock)

        return (input, init) => fetchMock(input instanceof URL ? input.href : input, init)
      }),
    ),
  ),
  Layer.provideMerge(Layer.sync(FetchMock, () => fetchMock.sandbox())),
)

export const TestContext = _TestContext.TestContext
