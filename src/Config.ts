import { Config, Layer } from 'effect'
import { RedisConfig } from './Redis.js'
import { SlackChannelConfig } from './Router.js'
import { SlackApiConfig } from './Slack.js'

const slackApiConfig = Config.nested(
  Config.map(Config.string('ACCESS_TOKEN'), accessToken => ({ accessToken }) satisfies SlackApiConfig),
  'SLACK',
)

const slackChannelConfig = Config.nested(
  Config.map(Config.string('CHANNEL_ID'), id => ({ id }) satisfies SlackChannelConfig),
  'SLACK',
)

const redisConfig = Config.nested(
  Config.all({
    url: Config.mapAttempt(Config.string('URL'), url => new URL(url)),
    family: Config.integer('IP_VERSION').pipe(Config.withDefault(4)),
  }),
  'REDIS',
)

export const ConfigLive = Layer.mergeAll(
  Layer.effect(SlackApiConfig, slackApiConfig),
  Layer.effect(SlackChannelConfig, slackChannelConfig),
  Layer.effect(RedisConfig, redisConfig),
)
