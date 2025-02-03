import { Headers, HttpClient, UrlParams } from '@effect/platform'
import { Effect, flow } from 'effect'

export const LoggingHttpClient = Effect.andThen(
  HttpClient.HttpClient,
  flow(
    HttpClient.tapRequest(request =>
      Effect.logDebug('Sending HTTP Request').pipe(
        Effect.annotateLogs({
          headers: Headers.redact(request.headers, 'authorization'),
          url: request.url,
          urlParams: UrlParams.toString(request.urlParams),
          method: request.method,
        }),
      ),
    ),
    HttpClient.tap(response =>
      Effect.logDebug('Received HTTP response').pipe(
        Effect.annotateLogs({
          status: response.status,
          headers: response.headers,
          url: response.request.url,
          urlParams: UrlParams.toString(response.request.urlParams),
          method: response.request.method,
        }),
      ),
    ),
    HttpClient.tapError(error =>
      Effect.logError('Error sending HTTP request').pipe(
        Effect.annotateLogs({
          reason: error.reason,
          error: error.cause,
          url: error.request.url,
          urlParams: UrlParams.toString(error.request.urlParams),
          method: error.request.method,
        }),
      ),
    ),
  ),
)
