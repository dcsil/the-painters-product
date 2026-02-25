import type { ConversationMessage } from './analysis-types'

export function buildHallucinationPrompt(conversation: ConversationMessage[]): string {
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
