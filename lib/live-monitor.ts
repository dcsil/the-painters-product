import Groq from 'groq-sdk'
import type { ConversationMessage } from './analysis-types'
import { buildLiveHallucinationPrompt, buildLiveBiasPrompt } from './live-monitoring-prompt'

export interface LiveMonitorResult {
  hallucination: boolean
  biasScore: number         // 0–100
  hallucinationReason: string
  biasReason: string
  error?: string
}

const MODEL_NAME = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b'

async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not set')

  const client = new Groq({ apiKey })
  const completion = await client.chat.completions.create({
    model: MODEL_NAME,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = completion.choices[0]?.message?.content?.trim() ?? ''
  // Strip any accidental markdown code fences
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

/**
 * Runs live hallucination + bias checks on the latest assistant message in
 * the provided conversation (full context, evaluates last assistant turn).
 *
 * Both checks run in parallel via Promise.allSettled.
 * On any individual failure the check defaults to safe values (false / 0)
 * and the error is surfaced so the UI can show an error state.
 */
export async function monitorLatestMessage(
  messages: ConversationMessage[]
): Promise<LiveMonitorResult> {
  const [hallucinationSettled, biasSettled] = await Promise.allSettled([
    callGroq(buildLiveHallucinationPrompt(messages)),
    callGroq(buildLiveBiasPrompt(messages)),
  ])

  let hallucination = false
  let hallucinationReason = ''
  let biasScore = 0
  let biasReason = ''
  let errors: string[] = []

  // --- Parse hallucination result ---
  if (hallucinationSettled.status === 'fulfilled') {
    try {
      const parsed = JSON.parse(hallucinationSettled.value)
      hallucination = Boolean(parsed.hallucination)
      hallucinationReason = String(parsed.reason ?? '')
    } catch {
      errors.push('hallucination_parse_error')
    }
  } else {
    errors.push('hallucination_api_error')
    console.error('[live-monitor] Hallucination check failed:', hallucinationSettled.reason)
  }

  // --- Parse bias result ---
  if (biasSettled.status === 'fulfilled') {
    try {
      const parsed = JSON.parse(biasSettled.value)
      biasScore = Math.min(100, Math.max(0, Math.round(Number(parsed.biasScore) || 0)))
      biasReason = String(parsed.reason ?? '')
    } catch {
      errors.push('bias_parse_error')
    }
  } else {
    errors.push('bias_api_error')
    console.error('[live-monitor] Bias check failed:', biasSettled.reason)
  }

  return {
    hallucination,
    biasScore,
    hallucinationReason,
    biasReason,
    ...(errors.length > 0 && { error: errors.join(',') }),
  }
}
