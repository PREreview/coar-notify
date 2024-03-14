import OpenAI from 'openai'
import { promptData } from './prompt-data'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const getMessage = async (title: string, authors: string, abstract: string) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `
Write in friendly, simple, natural language.
Write in the active voice.
Write in US English (en-US).
You can include emojis.
Do not include hashtags.
Be positive, but ensure you don't discourage those who might feel marginalised or suffer from something like imposter syndrome from participating.
Don't use hyperbole.
Use objective vocabulary.
Don't repeat terms.
Use Slack-compatible Markdown.
Our name for a peer review is 'PREreview'.
        `,
      },
      {
        role: 'user',
        content: `
Someone has requested a review of a scientific preprint. They are not reviewing the preprint themselves; they might be an author.

Determine keywords, disciplines and topics from the abstract.

Use and emphasize these in a sentence of about 16 words, asking people to review the preprint.

Do not use keywords that appear in the title.

Do not use the word 'expertise'.
        `,
      },
      {
        role: 'user',
        content: `
Requester: Chad Sansing

Title: ${title}

Authors: ${authors}

Abstract: """
${abstract}
"""
  `,
      },
      {
        role: 'user',
        content: `
Here are some examples:

🛟 Chris Wilkinson needs your help with reviews of this preprint all about *biochemistry*, *protein degradation*, and *oxindoles*.

📣 Help Chris Wilkinson by reviewing this preprint focused on *biochemistry*, *protein degradation*, and *oxindoles*.

🤝 Junyue Rose invites you to review this preprint about *prison conditions*, *institutional racism*, and the *industrial-prison complex*.

🐔 If you’re excited by *habituation*, *gene silencing*, *chicken welfare*, and *blood parameters*, help Maya Garcia by reviewing this preprint.

🐟 If *rivers*, *beavers*, and *fish habitats* interest you, help Li Na Chen by writing a PREreview of this preprint.

🔎 Grace Abara is looking for help with reviews of this preprint about *peer review*, *preprint services*, and *scholarly communication*.
          `,
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

for (const { title, authors, abstract } of promptData) {
  const message = await getMessage(title, authors, abstract)
  console.log(`
Title: ${title}
Message: ${message}
    `)
}
