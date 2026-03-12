import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateChatReply } from '@/lib/chat-reply'
import { monitorLatestMessage } from '@/lib/live-monitor'
import type { ChatMessage } from '@/lib/chat-reply'
import type { ConversationMessage } from '@/lib/analysis-types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, message } = body as { sessionId?: string; message: string }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Create a new session if none provided
    let session = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null

    if (!session) {
      session = await prisma.chatSession.create({ data: {} })
    }

    // Reject messages for already-ended sessions
    if (session.endedAt) {
      return NextResponse.json({ error: 'This session has already ended' }, { status: 400 })
    }

    // Persist the user message
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message.trim(),
      },
    })

    // Load full conversation for context
    const allMessages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    })

    const history: ChatMessage[] = allMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Generate bot reply
    const replyText = await generateChatReply(history)

    // Persist the assistant reply (capture ID for monitoring update)
    const assistantMsg = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: replyText,
      },
    })

    // Update last activity timestamp
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    })

    // --- Live monitoring: run hallucination + bias checks ---
    const messagesForMonitor = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    })

    const conversationForMonitor: ConversationMessage[] = messagesForMonitor.map(m => ({
      id: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    let monitoringResult = null
    try {
      monitoringResult = await monitorLatestMessage(conversationForMonitor)
      // Persist monitoring result on the assistant message
      await prisma.chatMessage.update({
        where: { id: assistantMsg.id },
        data: { monitoringData: JSON.stringify(monitoringResult) },
      })
    } catch (err) {
      // Monitoring failure is non-fatal — chat continues, panel shows error state
      console.error('[chat] Live monitoring error:', err)
    }

    // Fetch the full updated message list (after monitoring is persisted)
    const updatedMessages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      sessionId: session.id,
      messages: updatedMessages,
      monitoringResult,
    })
  } catch (error) {
    console.error('[chat] Error:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
