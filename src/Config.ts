import { Config, Layer } from 'effect'
import * as Prereview from './Prereview.js'
import { PublicUrl } from './Router.js'

const publicUrlConfig = Config.url('PUBLIC_URL')

const prereviewConfig = Prereview.layerConfig(
  Config.nested(
    Config.all({
      url: Config.url('URL'),
    }),
    'PREREVIEW',
  ),
)

export const ConfigLive = Layer.mergeAll(Layer.effect(PublicUrl, publicUrlConfig), prereviewConfig)
