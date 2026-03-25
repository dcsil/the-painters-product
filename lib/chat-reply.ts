import Groq from 'groq-sdk'
import { isGroqRateLimitError } from './groq'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Chatbot uses its own model (conversational quality), with the same
// fallback ordering as the analysis pipeline on rate limit errors.
const PRIMARY_CHAT_MODEL = process.env.GROQ_CHAT_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct'
const CHAT_MODEL_CHAIN = [
  PRIMARY_CHAT_MODEL,
  'moonshotai/kimi-k2-instruct-0905',
  'moonshotai/kimi-k2-instruct',
  'groq/compound',
].filter((m, i, arr) => arr.indexOf(m) === i)

const SYSTEM_PROMPT = `You are a helpful customer support assistant. Be concise, professional, and polite.
Answer customer questions clearly and accurately. If you don't know something, say so honestly rather than guessing.
Keep responses focused and appropriately brief.`

/**
 * Generates a chatbot reply given the conversation history so far.
 * Tries each model in CHAT_MODEL_CHAIN in order on rate limit errors.
 */
export async function generateChatReply(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set')
  }

  const client = new Groq({ apiKey })
  let lastError: unknown

  for (const modelName of CHAT_MODEL_CHAIN) {
    try {
      const completion = await client.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      })

      const text = completion.choices[0]?.message?.content?.trim()
      if (!text) {
        throw new Error('Groq returned empty response')
      }

      if (modelName !== PRIMARY_CHAT_MODEL) {
        console.log(`[chat-reply] Rate limit fallback succeeded on model: ${modelName}`)
      }
      return text
    } catch (err) {
      if (isGroqRateLimitError(err)) {
        console.warn(`[chat-reply] Rate limit hit on ${modelName}, trying next fallback...`)
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError ?? new Error('All Groq chat models exhausted due to rate limits')
}
