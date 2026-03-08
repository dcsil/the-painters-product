import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runConversationAnalysis } from '@/lib/run-analysis'
import { sendChatAnalysisAlert } from '@/lib/send-alert-email'
import type { ConversationMessage, AnalysisCategory } from '@/lib/analysis-types'

export const maxDuration = 120

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    const body = await request.json().catch(() => ({}))
    const analysisMode = (body.analysisMode as string) ?? 'groq'
    const selectedAnalysesRaw = (body.selectedAnalyses as string) ?? 'hallucination,bias,toxicity'
    const selectedAnalyses = selectedAnalysesRaw.split(',') as AnalysisCategory[]

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.endedAt) {
      // Already completed — return the existing upload link
      return NextResponse.json({ uploadId: session.uploadId, alreadyCompleted: true })
    }

    if (session.messages.length === 0) {
      return NextResponse.json({ error: 'Cannot analyze an empty conversation' }, { status: 400 })
    }

    // Mark session as ended
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    })

    // Convert messages to analysis format
    const conversation: ConversationMessage[] = session.messages.map(m => ({
      id: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const conversationJson = JSON.stringify(conversation)
    const fileSize = Buffer.byteLength(conversationJson, 'utf-8')
    const fileName = `chat-${sessionId}`

    // Validate API keys
    if ((analysisMode === 'gemini' || analysisMode === 'both') && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 400 })
    }
    if ((analysisMode === 'groq' || analysisMode === 'both') && !process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 400 })
    }

    const { uploadId, success, error } = await runConversationAnalysis(conversation, {
      mode: analysisMode,
      selectedAnalyses,
      groundTruthContent: null,
      fileName,
      fileSize,
      source: 'chat',
    })

    // Link the upload back to this chat session
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { uploadId },
    })

    if (!success) {
      return NextResponse.json({ uploadId, error }, { status: 500 })
    }

    // Send alert email if any analyst has one configured
    const allPrefs = await prisma.userPreferences.findMany({
      where: { alertEmail: { not: null } },
      select: { alertEmail: true },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const dashboardUrl = `${baseUrl}/dashboard/${uploadId}`

    await Promise.allSettled(
      allPrefs
        .filter(p => p.alertEmail)
        .map(p =>
          sendChatAnalysisAlert({
            to: p.alertEmail!,
            sessionId,
            uploadId,
            messageCount: session.messages.length,
            dashboardUrl,
          })
        )
    )

    return NextResponse.json({ uploadId, success: true })
  } catch (error) {
    console.error('[chat/complete] Error:', error)
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 })
  }
}
