import Groq from 'groq-sdk'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// llama-3.3-70b-versatile: best cost/quality balance on Groq for conversational tasks.
// Significantly better reasoning than the 8b model used for analysis, at a still-low cost.
const CHAT_MODEL = process.env.GROQ_CHAT_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct'

const SYSTEM_PROMPT = `You are a helpful customer support assistant. Be concise, professional, and polite.
Answer customer questions clearly and accurately. If you don't know something, say so honestly rather than guessing.
Keep responses focused and appropriately brief.`

/**
 * Generates a chatbot reply given the conversation history so far.
 * Uses Groq (llama-3.3-70b-versatile by default) for fast, cost-effective responses.
 */
export async function generateChatReply(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set')
  }

  const client = new Groq({ apiKey })

  const completion = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
  })

  const text = completion.choices[0]?.message?.content?.trim()
  if (!text) {
    throw new Error('Groq returned empty response')
  }

  return text
}
