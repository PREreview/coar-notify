import { Config, type ConfigError, Context, Effect, Layer } from 'effect'

export class PrereviewUrl extends Context.Tag('PrereviewUrl')<PrereviewUrl, URL>() {}

export const layer = (options: {
  url: typeof PrereviewUrl.Service
}): Layer.Layer<PrereviewUrl, ConfigError.ConfigError> =>
  Layer.succeedContext(Context.empty().pipe(Context.add(PrereviewUrl, options.url)))

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
