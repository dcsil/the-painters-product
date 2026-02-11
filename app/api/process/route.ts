import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeHallucinations, ConversationMessage } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  let uploadId: string | undefined

  try {
    const body = await request.text()
    let parsedBody: { uploadId?: string; filePath?: string; conversationData?: ConversationMessage[] }

    try {
      parsedBody = JSON.parse(body)
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    uploadId = parsedBody.uploadId
    const conversationData = parsedBody.conversationData

    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID required' }, { status: 400 })
    }

    if (!conversationData || !Array.isArray(conversationData) || conversationData.length === 0) {
      return NextResponse.json({ error: 'Conversation data is required and must be a non-empty array' }, { status: 400 })
    }

    // Mark as processing immediately
    await prisma.upload.update({
      where: { id: uploadId },
      data: { status: 'processing' },
    })

    // Run Gemini analysis asynchronously so the HTTP response returns right away.
    // The polling page will pick up the status change.
    runAnalysis(uploadId, conversationData)

    return NextResponse.json({ success: true, message: 'Processing started' })
  } catch (error) {
    console.error('Process route error:', error)

    // If we already have an uploadId, mark it failed
    if (uploadId) {
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      }).catch(() => { /* best-effort */ })
    }

    return NextResponse.json({ error: 'Failed to start processing' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Background analysis — runs after the HTTP response has been sent
// ---------------------------------------------------------------------------

async function runAnalysis(uploadId: string, conversationData: ConversationMessage[]) {
  try {
    console.log(`[process] Starting Gemini hallucination analysis for upload ${uploadId}`)

    const result = await analyzeHallucinations(conversationData)

    console.log(`[process] Analysis complete — ${result.flaggedTurns.length} flagged turns`)

    await prisma.analysis.create({
      data: {
        uploadId,
        analysisType: 'hallucination',
        result: JSON.stringify(result),
        confidence: result.averageConfidence,
        detectedIssues: result.flaggedTurns.length,
      },
    })

    await prisma.upload.update({
      where: { id: uploadId },
      data: { status: 'completed' },
    })
  } catch (error) {
    console.error(`[process] Analysis failed for upload ${uploadId}:`, error)

    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'LLM analysis failed',
      },
    }).catch(() => { /* best-effort */ })
  }
}
