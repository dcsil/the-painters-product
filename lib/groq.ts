import Groq from 'groq-sdk'
import type { ConversationMessage, AnalysisCategory, AnalysisResult } from './analysis-types'
import { getPromptBuilder, buildCrossCheckPrompt } from './analysis-prompt'

const MODEL_NAME = process.env.GROQ_MODEL ?? 'meta-llama/llama-4-maverick-17b-128e-instruct'

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

export async function analyzeWithGroq(
  conversation: ConversationMessage[],
  category: AnalysisCategory = 'hallucination',
  groundTruth?: string | null,
  previousAnalysis?: AnalysisResult | null
): Promise<AnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set in environment variables')
  }

  const client = new Groq({ apiKey })

  const promptBuilder = getPromptBuilder(category)
  let prompt = promptBuilder(conversation, groundTruth)

  if (previousAnalysis) {
    prompt = buildCrossCheckPrompt(prompt, previousAnalysis, category)
  }

  const completion = await client.chat.completions.create({
    model: MODEL_NAME,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = completion.choices[0]?.message?.content?.trim()
  if (!text) {
    throw new Error('Groq returned empty response')
  }

  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  let parsed: AnalysisResult
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Groq returned invalid JSON: ${cleaned.substring(0, 300)}`)
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
