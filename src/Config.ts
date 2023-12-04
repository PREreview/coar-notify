import { Config, Effect, Layer } from 'effect'
import { RedisConfig } from './Redis.js'
import { SlackApiConfig } from './Slack.js'

const slackApiConfig = Config.nested(
  Config.map(Config.string('ACCESS_TOKEN'), accessToken => ({ accessToken }) satisfies SlackApiConfig),
  'SLACK',
)

const redisConfig = Config.nested(
  Config.mapAttempt(Config.string('URL'), url => ({ url: new URL(url) }) satisfies RedisConfig),
  'REDIS',
)

export const ConfigLive = Layer.mergeAll(
  Layer.effect(SlackApiConfig, Effect.config(slackApiConfig)),
  Layer.effect(RedisConfig, Effect.config(redisConfig)),
)
