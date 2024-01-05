import { Context, Data, Effect, Layer } from 'effect'
import Nodemailer from 'nodemailer'

export type Transporter = Nodemailer.Transporter<unknown>

export const Transporter = Context.Tag<Transporter>('Nodemailer/Transporter')

export class TransporterError extends Data.TaggedError('TransporterError')<{
  readonly cause?: Error
  readonly message: string
}> {}

export const layer: Layer.Layer<never, never, Transporter> = Layer.scoped(
  Transporter,
  Effect.succeed(Nodemailer.createTransport({ streamTransport: true })),
)

export const sendMail = (
  mailOptions: Nodemailer.SendMailOptions,
): Effect.Effect<Transporter, TransporterError, unknown> =>
  Effect.gen(function* (_) {
    const transporter = yield* _(Transporter)

    yield* _(Effect.tryPromise({ try: () => transporter.sendMail(mailOptions), catch: toTransporterError }))
  })

const toTransporterError = (error: unknown): TransporterError =>
  new TransporterError(error instanceof Error ? { cause: error, message: error.message } : { message: String(error) })
