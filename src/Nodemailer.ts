import { Context, Data, Effect, Layer, Option } from 'effect'
import Nodemailer from 'nodemailer'

export type Transporter = Nodemailer.Transporter<unknown>

export const Transporter = Context.GenericTag<Transporter>('Nodemailer/Transporter')

export class TransporterError extends Data.TaggedError('TransporterError')<{
  readonly cause?: Error
  readonly message: string
}> {}

export interface SmtpConfig {
  readonly url: URL
}

export const SmtpConfig = Context.GenericTag<SmtpConfig>('SmtpConfig')

export const layer: Layer.Layer<Transporter> = Layer.scoped(
  Transporter,
  Effect.gen(function* (_) {
    const smtpConfig = yield* _(Effect.serviceOption(SmtpConfig))

    return Option.match(smtpConfig, {
      onNone: () => Nodemailer.createTransport({ streamTransport: true }),
      onSome: smtpConfig => Nodemailer.createTransport(smtpConfig.url.href),
    })
  }),
)

export const sendMail = (
  mailOptions: Nodemailer.SendMailOptions,
): Effect.Effect<unknown, TransporterError, Transporter> =>
  Effect.gen(function* (_) {
    const transporter = yield* _(Transporter)

    yield* _(Effect.tryPromise({ try: () => transporter.sendMail(mailOptions), catch: toTransporterError }))
  })

const toTransporterError = (error: unknown): TransporterError =>
  new TransporterError(error instanceof Error ? { cause: error, message: error.message } : { message: String(error) })
