import { Config, Effect, Layer, Option } from 'effect'
import { SmtpConfig } from './Nodemailer.js'
import { OpenAiConfig } from './OpenAi.js'
import { RedisConfig } from './Redis.js'
import { SlackChannelConfig } from './ReviewRequest.js'
import { SlackApiConfig } from './Slack.js'

const slackApiConfig: Config.Config<SlackApiConfig> = Config.nested(
  Config.map(Config.string('ACCESS_TOKEN'), accessToken => ({ accessToken })),
  'SLACK',
)

const slackChannelConfig: Config.Config<SlackChannelConfig> = Config.nested(
  Config.map(Config.string('CHANNEL_ID'), id => ({ id })),
  'SLACK',
)

const redisConfig: Config.Config<RedisConfig> = Config.nested(
  Config.all({
    url: Config.mapAttempt(Config.string('URL'), url => new URL(url)),
    family: Config.integer('IP_VERSION').pipe(Config.withDefault(4)),
  }),
  'REDIS',
)

const smtpConfig: Config.Config<Option.Option<SmtpConfig>> = Config.option(
  Config.nested(
    Config.mapAttempt(Config.string('URL'), url => ({ url: new URL(url) })),
    'SMTP',
  ),
)

const openAiConfig = OpenAiConfig.layer(
  Config.nested(
    Config.all({
      apiKey: Config.secret('API_KEY'),
    }),
    'OPENAI',
  ),
)

export const ConfigLive = Layer.mergeAll(
  Layer.effect(SlackApiConfig, slackApiConfig),
  Layer.effect(SlackChannelConfig, slackChannelConfig),
  Layer.effect(RedisConfig, redisConfig),
  openAiConfig,
  Layer.unwrapEffect(
    smtpConfig.pipe(Effect.map(Option.match({ onNone: () => Layer.empty, onSome: Layer.succeed(SmtpConfig) }))),
  ),
)
