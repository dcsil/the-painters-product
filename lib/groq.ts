import Groq from 'groq-sdk'
import type { ConversationMessage, AnalysisCategory, AnalysisResult } from './analysis-types'
import { getPromptBuilder, buildCrossCheckPrompt } from './analysis-prompt'

// Fallback chain: primary (env-configured) → Kimi K2 (0905 snapshot) →
// Kimi K2 (latest) → compound (very high rate limits, last resort).
// On a rate-limit error, each model is tried in order. Non-rate-limit errors
// propagate immediately without attempting the next model.
// Deduplication prevents retrying the same model if GROQ_MODEL already
// matches one of the fallback entries.
const PRIMARY_MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b'
export const GROQ_MODEL_CHAIN = [
  PRIMARY_MODEL,
  'moonshotai/kimi-k2-instruct-0905',
  'moonshotai/kimi-k2-instruct',
  'groq/compound',
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

export function isGroqRateLimitError(error: unknown): boolean {
  // The Groq SDK surfaces rate limit responses as APIError with status 429
  if (error instanceof Groq.APIError) {
    return error.status === 429
  }
  // Fallback: check message text in case the error is wrapped
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('429') ||
      msg.includes('rate limit') ||
      msg.includes('rate_limit_exceeded') ||
      msg.includes('tokens per minute') ||
      msg.includes('requests per minute')
    )
  }
  return false
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

  let lastError: unknown
  for (const modelName of GROQ_MODEL_CHAIN) {
    try {
      console.log(`[groq] Trying model: ${modelName}`)
      const completion = await client.chat.completions.create({
        model: modelName,
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

      if (modelName !== PRIMARY_MODEL) {
        console.log(`[groq] Rate limit fallback succeeded on model: ${modelName}`)
      }
      return parsed
    } catch (err) {
      if (isGroqRateLimitError(err)) {
        console.warn(`[groq] Rate limit hit on ${modelName}, trying next fallback...`)
        lastError = err
        continue
      }
      // Non-rate-limit errors propagate immediately — no point trying another model
      throw err
    }
  }

  throw lastError ?? new Error('All Groq models exhausted due to rate limits')
}
