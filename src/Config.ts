import { Config, Effect, Layer, Option } from 'effect'
import { SmtpConfig } from './Nodemailer.js'
import { OpenAiConfig } from './OpenAi.js'
import * as Prereview from './Prereview.js'
import { RedisConfig } from './Redis.js'
import { SlackChannelConfig } from './ReviewRequest.js'
import { PrereviewAuthToken, PublicUrl, SlackShareChannelId } from './Router.js'
import type * as Slack from './Slack.js'
import { SlackApiConfig, SlackChannelId } from './Slack.js'

const slackApiConfig: Config.Config<SlackApiConfig> = Config.nested(
  Config.map(Config.string('ACCESS_TOKEN'), accessToken => ({ accessToken })),
  'SLACK',
)

const slackChannelConfig: Config.Config<SlackChannelConfig> = Config.nested(
  Config.map(Config.string('CHANNEL_ID'), id => ({ id: SlackChannelId(id) })),
  'SLACK',
)

const slackShareChannelId: Config.Config<Slack.SlackChannelId> = Config.nested(
  Config.map(Config.string('SHARE_CHANNEL_ID'), SlackChannelId),
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
      apiKey: Config.redacted('API_KEY'),
    }),
    'OPENAI',
  ),
)

const publicUrlConfig = Config.url('PUBLIC_URL')

const prereviewConfig = Prereview.layerConfig(
  Config.nested(
    Config.all({
      url: Config.url('URL'),
    }),
    'PREREVIEW',
  ),
)

const prereviewAuthTokenConfig = Config.string('PREREVIEW_AUTH_TOKEN')

export const ConfigLive = Layer.mergeAll(
  Layer.effect(SlackApiConfig, slackApiConfig),
  Layer.effect(SlackShareChannelId, slackShareChannelId),
  Layer.effect(SlackChannelConfig, slackChannelConfig),
  Layer.effect(RedisConfig, redisConfig),
  Layer.effect(PublicUrl, publicUrlConfig),
  prereviewConfig,
  Layer.effect(PrereviewAuthToken, prereviewAuthTokenConfig),
  openAiConfig,
  Layer.unwrapEffect(
    smtpConfig.pipe(Effect.map(Option.match({ onNone: () => Layer.empty, onSome: Layer.succeed(SmtpConfig) }))),
  ),
)
