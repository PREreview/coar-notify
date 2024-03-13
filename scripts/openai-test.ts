import { abs } from 'effect/BigDecimal'
import OpenAI from 'openai'
import { promptData } from './prompt-data'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const getMessage = async (title: string, abstract: string) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'user',
        content: `Given the following title and abstract of a scientific preprint, determine subject-matter keywords.\n\nUse these subject-matter keywords in a sentence asking people to review the preprint.\n\nLimit it to 20 words, and ensure that it is written in friendly, simple, natural language. Write in the active voice. You can include emojis. Do not include hashtags. Ensure you don't discourage those who might feel marginalised or suffer from something like imposter syndrome from participating. Don't repeat terms. Highlight subject-matter keywords in Slack-compatible Markdown.\n\nTitle: ${title}\n\nAbstract: \"\"\"\n${abstract}\n\"\"\"`,
      },
      {
        role: 'user',
        content:
          "Here are some examples:\n\nReview this preprint if you have an appetite for *biochemistry*, *protein breakdown*, or *oxindoles*. 🧪\nAre you interested in *biochemistry*, *protein degradation*, or *oxindoles*? Review this preprint!\nYou might want to review this preprint if you're into *peer review*, *preprint services*, and *scholarly communication*. 📝\n📣 We're looking for researchers interested in *biochemistry*, *protein degradation*, or *oxindoles* to review this preprint.\nCan you help review a preprint about *biochemistry*, *protein degradation*, and *oxindoles*?\nInterested in *ecology* and *implicit biases* in *ornithological research*? Help review this preprint on 🐦 bird study bias!\nInterested in *international higher education patterns* and *equity*? Help review this preprint on 🇦🇺 Australian universities and global perspectives.\n🏞️🦫🐟 Love studying *rivers*, *beavers*, and *fish habitats*? Help review this ecology preprint.\nInterested in *higher education* and *online classes* amidst COVID-19 in 🇳🇵 Nepal? Help review this preprint on *digital learning initiatives*!\nResearchers excited about *habituation*, *gene silencing*, *chicken welfare*, and *blood parameters* should review this preprint. ✨",
      },
    ],
    temperature: 0.25,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  })
  return response.choices[0].message.content
}

for (const { title, abstract } of promptData) {
  const message = await getMessage(title, abstract)
  console.log(`
Title: ${title}
Message: ${message}
    `)
}
