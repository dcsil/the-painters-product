import { prisma } from '@/lib/prisma'
import { analyzeWithGemini } from '@/lib/gemini'
import { analyzeWithGroq } from '@/lib/groq'
import type {
  ConversationMessage,
  AnalysisCategory,
  AnalysisResult,
  HallucinationAnalysisResult,
  BiasAnalysisResult,
} from '@/lib/analysis-types'

/**
 * Builds a fully-typed synthetic AnalysisResult from a live-monitor hint.
 * This is passed as `previousAnalysis` so the batch LLM cross-checks and confirms
 * what the per-message monitor already caught.
 */
function buildSyntheticPriorResult(
  category: AnalysisCategory,
  hint: { reason: string; biasScore?: number }
): AnalysisResult {
  if (category === 'hallucination') {
    return {
      summary: `Live monitoring pre-check flagged a hallucination: ${hint.reason}`,
      hallucinationRate: 1,
      averageConfidence: 0.9,
      flaggedTurns: [
        {
          turnIndex: -1,
          assistantContent: '[detected by live monitor]',
          issueType: 'OVERCONFIDENCE',
          explanation: hint.reason,
          confidence: 0.9,
          numericalImpact: null,
        },
      ],
      issueBreakdown: {
        SELF_CONTRADICTION: 0,
        OVERCONFIDENCE: 1,
        FABRICATED_CITATION: 0,
        HARDCODED_FACT: 0,
      },
    } as HallucinationAnalysisResult
  }
  // bias (and any other category falls through to a bias-shaped result)
  return {
    summary: `Live monitoring pre-check flagged bias (score: ${hint.biasScore ?? 80}%): ${hint.reason}`,
    biasRate: (hint.biasScore ?? 80) / 100,
    averageConfidence: 0.9,
    flaggedTurns: [
      {
        turnIndex: -1,
        assistantContent: '[detected by live monitor]',
        issueType: 'STEREOTYPING',
        explanation: hint.reason,
        confidence: 0.9,
        affectedGroup: null,
      },
    ],
    issueBreakdown: { GENDER_BIAS: 0, RACIAL_BIAS: 0, AGE_BIAS: 0, STEREOTYPING: 1 },
  } as BiasAnalysisResult
}

async function storeAnalysis(uploadId: string, analysisType: string, result: AnalysisResult) {
  const flaggedCount = result.flaggedTurns?.length ?? 0
  const confidence = result.averageConfidence ?? 0

  await prisma.analysis.create({
    data: {
      uploadId,
      analysisType,
      result: JSON.stringify(result),
      confidence,
      detectedIssues: flaggedCount,
    },
  })

  console.log(`[analysis] ${analysisType} complete — ${flaggedCount} flagged turns`)
}

export async function runAnalysisPipeline(
  category: AnalysisCategory,
  mode: string,
  conversation: ConversationMessage[],
  groundTruth: string | null,
  uploadId: string,
  priorResult?: AnalysisResult | null
) {
  if (mode === 'gemini') {
    const result = await analyzeWithGemini(conversation, category, groundTruth, priorResult)
    await storeAnalysis(uploadId, `${category}-gemini`, result)
  } else if (mode === 'groq') {
    const result = await analyzeWithGroq(conversation, category, groundTruth, priorResult)
    await storeAnalysis(uploadId, `${category}-groq`, result)
  } else if (mode === 'both') {
    // Gemini cross-checks the live monitor hint (if any), then Groq cross-checks Gemini
    const geminiResult = await analyzeWithGemini(conversation, category, groundTruth, priorResult)
    await storeAnalysis(uploadId, `${category}-gemini`, geminiResult)
    const crossCheckResult = await analyzeWithGroq(conversation, category, groundTruth, geminiResult)
    await storeAnalysis(uploadId, `${category}-both`, crossCheckResult)
  }
}

export interface RunAnalysisOptions {
  mode: string
  selectedAnalyses: AnalysisCategory[]
  groundTruthContent: string | null
  fileName: string
  fileSize: number
  source?: string
  /** When a live-monitor violation was detected, prime the batch analysis with the finding. */
  liveMonitorHint?: {
    category: AnalysisCategory
    reason: string
    biasScore?: number
  }
}

/**
 * Creates an Upload record and runs the full analysis pipeline for a given conversation.
 * Used by both the file upload route and the chat session completion route.
 */
export async function runConversationAnalysis(
  conversation: ConversationMessage[],
  options: RunAnalysisOptions
): Promise<{ uploadId: string; success: boolean; error?: string }> {
  const {
    mode,
    selectedAnalyses,
    groundTruthContent,
    fileName,
    fileSize,
    source = 'upload',
    liveMonitorHint,
  } = options

  const upload = await prisma.upload.create({
    data: {
      fileName,
      fileSize,
      status: 'processing',
      analysisMode: mode,
      selectedAnalyses: selectedAnalyses.join(','),
      source,
    },
  })

  console.log(`[run-analysis] Upload record created: ${upload.id} (source=${source})`)

  try {
    const results = await Promise.allSettled(
      selectedAnalyses.map(category => {
        const prior =
          liveMonitorHint?.category === category
            ? buildSyntheticPriorResult(category, liveMonitorHint)
            : null
        return runAnalysisPipeline(category, mode, conversation, groundTruthContent, upload.id, prior)
      })
    )

    const failures = results.filter(r => r.status === 'rejected')
    const successes = results.filter(r => r.status === 'fulfilled')

    for (const f of failures) {
      if (f.status === 'rejected') {
        console.error('[run-analysis] Category failed:', f.reason)
      }
    }

    if (successes.length === 0) {
      throw new Error('All analyses failed')
    }

    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: 'completed' },
    })

    return { uploadId: upload.id, success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    console.error('[run-analysis] Analysis failed:', error)
    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: 'failed', errorMessage: message },
    })
    return { uploadId: upload.id, success: false, error: message }
  }
}
