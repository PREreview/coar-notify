import { Cause, FiberId, HashMap, List, Logger } from 'effect'

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
