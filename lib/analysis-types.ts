// Shared types for hallucination analysis (used by Gemini, Groq, etc.)

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
  hallucinationRate: number
  averageConfidence: number
  flaggedTurns: FlaggedTurn[]
  issueBreakdown: {
    SELF_CONTRADICTION: number
    OVERCONFIDENCE: number
    FABRICATED_CITATION: number
    HARDCODED_FACT: number
  }
}
