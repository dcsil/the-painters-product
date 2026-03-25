import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ConversationMessage, AnalysisCategory, AnalysisResult } from './analysis-types'
import { getPromptBuilder, buildCrossCheckPrompt } from './analysis-prompt'

// Re-export types for backward compatibility
export type { ConversationMessage, FlaggedTurn, HallucinationAnalysisResult } from './analysis-types'

// Fallback chain: primary (env-configured) → 2.5 Flash → 3.1 Flash Lite.
// On a rate-limit error, each model is tried in order. Non-rate-limit errors
// propagate immediately without attempting the next model.
// Deduplication prevents retrying the same model if GEMINI_MODEL happens to
// already match one of the fallback entries.
const PRIMARY_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
export const GEMINI_MODEL_CHAIN = [
  PRIMARY_MODEL,
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
].filter((m, i, arr) => arr.indexOf(m) === i)

const DEFAULTS: Record<AnalysisCategory, Record<string, unknown>> = {
  hallucination: {
    flaggedTurns: [],
    issueBreakdown: { SELF_CONTRADICTION: 0, OVERCONFIDENCE: 0, FABRICATED_CITATION: 0, HARDCODED_FACT: 0 },
    hallucinationRate: 0,
    averageConfidence: 0,
  },
  bias: {
    flaggedTurns: [],
    issueBreakdown: { GENDER_BIAS: 0, RACIAL_BIAS: 0, AGE_BIAS: 0, STEREOTYPING: 0 },
    biasRate: 0,
    averageConfidence: 0,
  },
  toxicity: {
    flaggedTurns: [],
    issueBreakdown: { HOSTILE_LANGUAGE: 0, CONDESCENSION: 0, INAPPROPRIATE_CONTENT: 0, PROFANITY: 0 },
    toxicityRate: 0,
    averageConfidence: 0,
  },
}

function isGeminiRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message
    return (
      msg.includes('429') ||
      msg.toLowerCase().includes('resource has been exhausted') ||
      msg.toLowerCase().includes('quota exceeded') ||
      msg.toLowerCase().includes('rate limit')
    )
  }
  return false
}

export async function analyzeWithGemini(
  conversation: ConversationMessage[],
  category: AnalysisCategory = 'hallucination',
  groundTruth?: string | null,
  previousAnalysis?: AnalysisResult | null
): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables')
  }

  const genAI = new GoogleGenerativeAI(apiKey)

  const promptBuilder = getPromptBuilder(category)
  let prompt = promptBuilder(conversation, groundTruth)

  if (previousAnalysis) {
    prompt = buildCrossCheckPrompt(prompt, previousAnalysis, category)
  }

  let lastError: unknown
  for (const modelName of GEMINI_MODEL_CHAIN) {
    try {
      console.log(`[gemini] Trying model: ${modelName}`)
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(prompt)
      const text = result.response.text().trim()
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

      let parsed: AnalysisResult
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        throw new Error(`Gemini returned invalid JSON: ${cleaned.substring(0, 300)}`)
      }

      // Apply defaults for the category
      const defaults = DEFAULTS[category]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj = parsed as any
      for (const [key, value] of Object.entries(defaults)) {
        if (obj[key] === undefined) {
          obj[key] = value
        }
      }

      if (modelName !== PRIMARY_MODEL) {
        console.log(`[gemini] Rate limit fallback succeeded on model: ${modelName}`)
      }
      return parsed
    } catch (err) {
      if (isGeminiRateLimitError(err)) {
        console.warn(`[gemini] Rate limit hit on ${modelName}, trying next fallback...`)
        lastError = err
        continue
      }
      // Non-rate-limit errors propagate immediately — no point trying another model
      throw err
    }
  }

  throw lastError ?? new Error('All Gemini models exhausted due to rate limits')
}
