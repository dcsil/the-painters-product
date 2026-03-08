import { prisma } from '@/lib/prisma'
import { analyzeWithGemini } from '@/lib/gemini'
import { analyzeWithGroq } from '@/lib/groq'
import type { ConversationMessage, AnalysisCategory, AnalysisResult } from '@/lib/analysis-types'

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
  uploadId: string
) {
  if (mode === 'gemini') {
    const result = await analyzeWithGemini(conversation, category, groundTruth)
    await storeAnalysis(uploadId, `${category}-gemini`, result)
  } else if (mode === 'groq') {
    const result = await analyzeWithGroq(conversation, category, groundTruth)
    await storeAnalysis(uploadId, `${category}-groq`, result)
  } else if (mode === 'both') {
    const geminiResult = await analyzeWithGemini(conversation, category, groundTruth)
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
      selectedAnalyses.map(category =>
        runAnalysisPipeline(category, mode, conversation, groundTruthContent, upload.id)
      )
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
