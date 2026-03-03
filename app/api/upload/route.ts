import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import { analyzeWithGemini } from '@/lib/gemini'
import { analyzeWithGroq } from '@/lib/groq'
import { auth } from '@/lib/auth'
import type { ConversationMessage, AnalysisCategory, AnalysisResult } from '@/lib/analysis-types'

// Allow up to 120s for multi-analysis on Vercel
export const maxDuration = 120

async function runAnalysisPipeline(
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
    // Step 1: Gemini first pass
    const geminiResult = await analyzeWithGemini(conversation, category, groundTruth)
    await storeAnalysis(uploadId, `${category}-gemini`, geminiResult)

    // Step 2: Groq cross-check with Gemini's output
    const crossCheckResult = await analyzeWithGroq(conversation, category, groundTruth, geminiResult)
    await storeAnalysis(uploadId, `${category}-both`, crossCheckResult)
  }
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

  console.log(`[upload] ${analysisType} complete — ${flaggedCount} flagged turns`)
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Upload request received')

    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string
    const fileSize = parseInt(formData.get('fileSize') as string)

    // New optional fields
    const analysisMode = formData.get('analysisMode') as string | null
    const selectedAnalysesStr = formData.get('selectedAnalyses') as string | null
    const groundTruthId = formData.get('groundTruthId') as string | null

    console.log('File info:', { fileName, fileSize, fileType: file?.type })

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file content
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Parse and validate JSON
    let conversationData: ConversationMessage[]
    try {
      const text = buffer.toString('utf-8').replace(/^\uFEFF/, '').trim()
      conversationData = JSON.parse(text)
      console.log('JSON parsed successfully, items:', conversationData.length)
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid JSON format. Please check your file.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 })
    }

    if (!Array.isArray(conversationData)) {
      return NextResponse.json({ error: 'JSON must be an array' }, { status: 400 })
    }

    // Resolve effective settings
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    })

    const mode = analysisMode ?? prefs?.defaultAnalysisMode ?? 'gemini'
    const analysesStr = selectedAnalysesStr ?? prefs?.defaultAnalyses ?? 'hallucination,bias,toxicity'
    const selectedAnalyses = analysesStr.split(',') as AnalysisCategory[]

    // Validate mode has the required API key(s)
    if ((mode === 'gemini' || mode === 'both') && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 400 })
    }
    if ((mode === 'groq' || mode === 'both') && !process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 400 })
    }

    // Fetch ground truth content if provided
    let groundTruthContent: string | null = null
    if (groundTruthId) {
      const gt = await prisma.groundTruth.findUnique({ where: { id: groundTruthId } })
      if (gt && (gt.isBuiltIn || gt.userId === session.user.id)) {
        groundTruthContent = gt.content
      }
    }

    // Upload file to Vercel Blob
    const timestamp = Date.now()
    const savedFileName = `${timestamp}-${fileName}`
    const blob = await put(savedFileName, buffer, { access: 'public' })
    console.log('File uploaded to blob:', blob.url)

    // Create upload record
    const upload = await prisma.upload.create({
      data: {
        userId: session.user.id,
        fileName: savedFileName,
        fileSize: fileSize,
        status: 'processing',
        analysisMode: mode,
        groundTruthId: groundTruthId ?? undefined,
        selectedAnalyses: analysesStr,
      }
    })

    console.log('Upload record created:', upload.id)

    // Run analyses — parallel across categories, sequential within "both" mode
    try {
      console.log(`[upload] Starting analysis: mode=${mode}, categories=${selectedAnalyses.join(',')}`)

      const results = await Promise.allSettled(
        selectedAnalyses.map(category =>
          runAnalysisPipeline(category, mode, conversationData, groundTruthContent, upload.id)
        )
      )

      const failures = results.filter(r => r.status === 'rejected')
      const successes = results.filter(r => r.status === 'fulfilled')

      for (const f of failures) {
        if (f.status === 'rejected') {
          console.error('[upload] Analysis category failed:', f.reason)
        }
      }

      if (successes.length === 0) {
        throw new Error('All analyses failed')
      }

      await prisma.upload.update({
        where: { id: upload.id },
        data: { status: 'completed' },
      })
    } catch (analysisError) {
      console.error('[upload] Analysis failed:', analysisError)
      await prisma.upload.update({
        where: { id: upload.id },
        data: {
          status: 'failed',
          errorMessage: analysisError instanceof Error ? analysisError.message : 'Analysis failed'
        }
      })
    }

    return NextResponse.json({
      success: true,
      uploadId: upload.id,
      message: 'File uploaded and analysed successfully'
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
