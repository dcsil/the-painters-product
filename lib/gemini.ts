import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ConversationMessage, AnalysisCategory, AnalysisResult } from './analysis-types'
import { getPromptBuilder, buildCrossCheckPrompt } from './analysis-prompt'

// Re-export types for backward compatibility
export type { ConversationMessage, FlaggedTurn, HallucinationAnalysisResult } from './analysis-types'

const MODEL_NAME = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

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
  const model = genAI.getGenerativeModel({ model: MODEL_NAME })

  const promptBuilder = getPromptBuilder(category)
  let prompt = promptBuilder(conversation, groundTruth)

  if (previousAnalysis) {
    prompt = buildCrossCheckPrompt(prompt, previousAnalysis, category)
  }

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

  return parsed
}
