import { Config, Effect, Layer } from 'effect'
import { SlackApiConfig } from './Slack.js'

const slackApiConfig = Config.nested(
  Config.map(Config.string('ACCESS_TOKEN'), accessToken => ({ accessToken }) satisfies SlackApiConfig),
  'SLACK',
)

export const ConfigLive = Layer.mergeAll(Layer.effect(SlackApiConfig, Effect.config(slackApiConfig)))
