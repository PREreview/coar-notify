import { HttpClient } from '@effect/platform'
import { Cause, Effect, FiberId, HashMap, List, Logger } from 'effect'

export const JsonLogger = Logger.make(({ annotations, cause, date, fiberId, logLevel, message, spans }) => {
  const now = new Date()
  const nowMillis = now.getTime()

  const data = {
    date,
    level: logLevel.label,
    fiber: FiberId.threadName(fiberId),
    message,
    cause: !Cause.isEmpty(cause) ? Cause.pretty(cause) : undefined,
    spans: List.isCons(spans)
      ? List.map(spans, _ => ({ label: _.label, timing: nowMillis - _.startTime })).pipe(List.toArray)
      : undefined,
    payload: !HashMap.isEmpty(annotations)
      ? HashMap.reduce(annotations, {} as Record<string, unknown>, (prev, v, k) => {
          prev[k] = v
          return prev
        })
      : undefined,
  }

  globalThis.console.log(JSON.stringify(data))
})

export const LoggingHttpClient = HttpClient.client.makeDefault(request =>
  Effect.Do.pipe(
    Effect.tap(() =>
      Effect.logDebug('Sending HTTP Request').pipe(
        Effect.annotateLogs({ headers: HttpClient.headers.redact(request.headers, 'authorization') }),
      ),
    ),
    Effect.zipRight(HttpClient.client.fetch()(request)),
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
