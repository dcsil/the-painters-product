import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateChatReply } from '@/lib/chat-reply'
import type { ChatMessage } from '@/lib/chat-reply'

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

    // Persist the assistant reply
    await prisma.chatMessage.create({
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

    // Return the full updated message list
    const updatedMessages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      sessionId: session.id,
      messages: updatedMessages,
    })
  } catch (error) {
    console.error('[chat] Error:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
