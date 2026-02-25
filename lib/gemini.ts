import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ConversationMessage, HallucinationAnalysisResult } from './analysis-types'
import { buildHallucinationPrompt } from './analysis-prompt'
import { analyzeWithGroq } from './groq'

// Re-export types for backward compatibility
export type { ConversationMessage, FlaggedTurn, HallucinationAnalysisResult } from './analysis-types'

const MODEL_NAME = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

export async function analyzeWithGemini(
  conversation: ConversationMessage[]
): Promise<HallucinationAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: MODEL_NAME })
  const prompt = buildHallucinationPrompt(conversation)

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  let parsed: HallucinationAnalysisResult
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${cleaned.substring(0, 300)}`)
  }

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

/** Runs one or both providers based on ANALYSIS_PROVIDER env (legacy single-provider mode). */
export async function analyzeHallucinations(
  conversation: ConversationMessage[]
): Promise<HallucinationAnalysisResult> {
  const provider = process.env.ANALYSIS_PROVIDER ?? 'gemini'
  if (provider === 'groq') {
    return analyzeWithGroq(conversation)
  }
  return analyzeWithGemini(conversation)
}
