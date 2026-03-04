// Shared types for analysis (used by Gemini, Groq, etc.)

export interface ConversationMessage {
  id: 'user' | 'assistant'
  content: string
}

// --- Hallucination Analysis ---

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

// --- Bias Analysis ---

export interface FlaggedBiasTurn {
  turnIndex: number
  assistantContent: string
  issueType: 'GENDER_BIAS' | 'RACIAL_BIAS' | 'AGE_BIAS' | 'STEREOTYPING'
  explanation: string
  confidence: number
  affectedGroup: string | null
}

export interface BiasAnalysisResult {
  summary: string
  biasRate: number
  averageConfidence: number
  flaggedTurns: FlaggedBiasTurn[]
  issueBreakdown: {
    GENDER_BIAS: number
    RACIAL_BIAS: number
    AGE_BIAS: number
    STEREOTYPING: number
  }
}

// --- Toxicity Analysis ---

export interface FlaggedToxicityTurn {
  turnIndex: number
  assistantContent: string
  issueType: 'HOSTILE_LANGUAGE' | 'CONDESCENSION' | 'INAPPROPRIATE_CONTENT' | 'PROFANITY'
  explanation: string
  confidence: number
  severityLevel: 'low' | 'medium' | 'high' | null
}

export interface ToxicityAnalysisResult {
  summary: string
  toxicityRate: number
  averageConfidence: number
  flaggedTurns: FlaggedToxicityTurn[]
  issueBreakdown: {
    HOSTILE_LANGUAGE: number
    CONDESCENSION: number
    INAPPROPRIATE_CONTENT: number
    PROFANITY: number
  }
}

// --- Union type ---

export type AnalysisCategory = 'hallucination' | 'bias' | 'toxicity'
export type AnalysisResult = HallucinationAnalysisResult | BiasAnalysisResult | ToxicityAnalysisResult
