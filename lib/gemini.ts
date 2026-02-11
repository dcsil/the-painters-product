import { GoogleGenerativeAI } from '@google/generative-ai'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationMessage {
  id: 'user' | 'assistant'
  content: string
}

export interface FlaggedTurn {
  turnIndex: number
  assistantContent: string
  issueType: 'SELF_CONTRADICTION' | 'OVERCONFIDENCE' | 'FABRICATED_CITATION' | 'HARDCODED_FACT'
  explanation: string
  confidence: number
  numericalImpact: string | null
}

export interface HallucinationAnalysisResult {
  summary: string
  hallucinationRate: number       // 0–1, ratio of flagged assistant turns to total assistant turns
  averageConfidence: number        // 0–1
  flaggedTurns: FlaggedTurn[]
  issueBreakdown: {
    SELF_CONTRADICTION: number
    OVERCONFIDENCE: number
    FABRICATED_CITATION: number
    HARDCODED_FACT: number
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MODEL_NAME = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(conversation: ConversationMessage[]): string {
  return `You are a hallucination detector analyzing a chatbot conversation. Analyze ONLY the ASSISTANT turns.
The conversation may be completely fine — if no hallucinations are detected, return an empty flaggedTurns array and a hallucinationRate of 0.

DETECTION RULES — flag an assistant turn only if it clearly matches one of:
1. SELF_CONTRADICTION: The assistant gives conflicting information about the same topic at different points in the conversation.
2. OVERCONFIDENCE: The assistant makes a definitive factual claim on an uncertain topic with no hedging (e.g. "It definitely costs X", "This always happens", "You will receive Y").
3. FABRICATED_CITATION: The assistant references a specific study, report, statistic, or named source that is likely invented (e.g. "According to our 2023 report...", "Studies show that 73% of...").
4. HARDCODED_FACT: The assistant states a specific number, date, price, or policy detail as certain fact when it may be inaccurate or unverifiable (e.g. exact dollar amounts, specific deadlines, precise percentages stated without caveat).

NUMERICAL_IMPACT: If a flagged hallucination involves any number (price, discount, fee, percentage, date), extract it as a string (e.g. "$25/month", "30%", "March 2024"). Otherwise set numericalImpact to null.

Be conservative — only flag turns where there is clear evidence of hallucination. Do not flag polite uncertainty or general statements.

Return ONLY valid JSON with no markdown, no code fences, no explanation. The JSON must match exactly:
{
  "summary": "<1–2 sentence overall assessment of the conversation quality>",
  "hallucinationRate": <float 0–1>,
  "averageConfidence": <float 0–1, average confidence across flagged turns, or 0 if none>,
  "flaggedTurns": [
    {
      "turnIndex": <int, 0-based index in the conversation array below>,
      "assistantContent": "<full text of the assistant's message>",
      "issueType": "<one of: SELF_CONTRADICTION | OVERCONFIDENCE | FABRICATED_CITATION | HARDCODED_FACT>",
      "explanation": "<concise reason why this is flagged>",
      "confidence": <float 0–1>,
      "numericalImpact": "<extracted value or null>"
    }
  ],
  "issueBreakdown": {
    "SELF_CONTRADICTION": <int>,
    "OVERCONFIDENCE": <int>,
    "FABRICATED_CITATION": <int>,
    "HARDCODED_FACT": <int>
  }
}

CONVERSATION:
${JSON.stringify(conversation, null, 2)}`
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

export async function analyzeHallucinations(
  conversation: ConversationMessage[]
): Promise<HallucinationAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: MODEL_NAME })

  const prompt = buildPrompt(conversation)

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  // Strip markdown code fences if the model includes them despite instructions
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  let parsed: HallucinationAnalysisResult
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${cleaned.substring(0, 300)}`)
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
