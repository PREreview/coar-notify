import { HttpClient } from '@effect/platform'
import { Effect } from 'effect'

export const LoggingHttpClient = HttpClient.client.makeDefault(request =>
  Effect.Do.pipe(
    Effect.tap(() =>
      Effect.logDebug('Sending HTTP Request').pipe(
        Effect.annotateLogs({ headers: HttpClient.headers.redact(request.headers, 'authorization') }),
      ),
    ),
    Effect.zipRight(HttpClient.client.fetch(request)),
    Effect.tap(response =>
      Effect.logDebug('Received HTTP response').pipe(
        Effect.annotateLogs({ status: response.status, headers: response.headers }),
      ),
    ),
    Effect.tapErrorTag('RequestError', error =>
      Effect.logError('Error sending HTTP request').pipe(
        Effect.annotateLogs({ reason: error.reason, error: error.error }),
      ),
    ),
    Effect.annotateLogs({
      url: request.url,
      urlParams: HttpClient.urlParams.toString(request.urlParams),
      method: request.method,
    }),
    Effect.withLogSpan('fetch'),
  ),
)
