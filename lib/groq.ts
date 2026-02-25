import Groq from 'groq-sdk'
import type { ConversationMessage, HallucinationAnalysisResult } from './analysis-types'
import { buildHallucinationPrompt } from './analysis-prompt'

const MODEL_NAME = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant'

export async function analyzeWithGroq(
  conversation: ConversationMessage[]
): Promise<HallucinationAnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set in environment variables')
  }

  const client = new Groq({ apiKey })
  const prompt = buildHallucinationPrompt(conversation)

  const completion = await client.chat.completions.create({
    model: MODEL_NAME,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = completion.choices[0]?.message?.content?.trim()
  if (!text) {
    throw new Error('Groq returned empty response')
  }

  // Strip markdown code fences if the model includes them
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  let parsed: HallucinationAnalysisResult
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Groq returned invalid JSON: ${cleaned.substring(0, 300)}`)
  }

  // Defensive defaults for optional fields
  parsed.flaggedTurns = parsed.flaggedTurns ?? []
  parsed.issueBreakdown = parsed.issueBreakdown ?? {
    SELF_CONTRADICTION: 0,
    OVERCONFIDENCE: 0,
    FABRICATED_CITATION: 0,
    HARDCODED_FACT: 0,
  }
  parsed.hallucinationRate = parsed.hallucinationRate ?? 0
  parsed.averageConfidence = parsed.averageConfidence ?? 0

  return parsed
}
