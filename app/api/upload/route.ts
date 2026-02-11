import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import { analyzeHallucinations, ConversationMessage } from '@/lib/gemini'

// Allow up to 60s for Gemini analysis on Vercel
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    console.log('Upload request received')

    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string
    const fileSize = parseInt(formData.get('fileSize') as string)

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

    // Upload file to Vercel Blob
    const timestamp = Date.now()
    const savedFileName = `${timestamp}-${fileName}`
    const blob = await put(savedFileName, buffer, { access: 'public' })
    const filePath = blob.url

    // Create or reuse demo user (no auth yet)
    let user = await prisma.user.findFirst({ where: { email: 'demo@example.com' } })
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'demo@example.com', name: 'Demo User' }
      })
    }

    // Create upload record
    const upload = await prisma.upload.create({
      data: {
        userId: user.id,
        fileName: savedFileName,
        fileSize: fileSize,
        status: 'processing'
      }
    })

    console.log('Upload record created:', upload.id)

    // Run Gemini analysis synchronously (works within Vercel's 60s limit)
    try {
      console.log(`[upload] Starting Gemini analysis for upload ${upload.id}`)
      const result = await analyzeHallucinations(conversationData)
      console.log(`[upload] Analysis complete — ${result.flaggedTurns.length} flagged turns`)

      await prisma.analysis.create({
        data: {
          uploadId: upload.id,
          analysisType: 'hallucination',
          result: JSON.stringify(result),
          confidence: result.averageConfidence,
          detectedIssues: result.flaggedTurns.length,
        }
      })

      await prisma.upload.update({
        where: { id: upload.id },
        data: { status: 'completed' }
      })
    } catch (analysisError) {
      console.error('[upload] Gemini analysis failed:', analysisError)
      await prisma.upload.update({
        where: { id: upload.id },
        data: {
          status: 'failed',
          errorMessage: analysisError instanceof Error ? analysisError.message : 'LLM analysis failed'
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
