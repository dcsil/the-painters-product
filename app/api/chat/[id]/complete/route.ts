import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runConversationAnalysis } from '@/lib/run-analysis'
import { sendChatAnalysisAlert } from '@/lib/send-alert-email'
import type { ConversationMessage, AnalysisCategory } from '@/lib/analysis-types'
import type { ViolationDetails } from '@/lib/send-alert-email'

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
    const violationDetails = (body.violationDetails as ViolationDetails | undefined) ?? undefined

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
    const endedReason = violationDetails ? 'violation' : 'user'
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date(), endedReason },
    })

    // Convert messages to analysis format (snapshot before adding "live agent" message)
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

    // If a live-monitor violation was detected, prime the batch analysis with the finding
    const liveMonitorHint = violationDetails
      ? {
          category: violationDetails.type as AnalysisCategory,
          reason: violationDetails.reason ?? '',
          biasScore: violationDetails.biasScore,
        }
      : undefined

    const { uploadId, success, error } = await runConversationAnalysis(conversation, {
      mode: analysisMode,
      selectedAnalyses,
      groundTruthContent: null,
      fileName,
      fileSize,
      source: 'chat',
      liveMonitorHint,
    })

    // Link the upload back to this chat session
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { uploadId },
    })

    // If this was a violation-triggered stop, append the "live agent" system message
    // Inserted AFTER analysis runs so the system message doesn't skew results
    if (violationDetails) {
      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: 'A live agent is being connected. Please hold on.',
        },
      })
    }

    if (!success) {
      return NextResponse.json({ uploadId, error }, { status: 500 })
    }

    // Send alert email to all analysts with a configured alertEmail
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
            violationDetails,
          })
        )
    )

    return NextResponse.json({ uploadId, success: true })
  } catch (error) {
    console.error('[chat/complete] Error:', error)
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 })
  }
}
