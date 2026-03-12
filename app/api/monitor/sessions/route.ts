import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sinceParam = searchParams.get('since')
  const limitParam = searchParams.get('limit')
  const cursor = searchParams.get('cursor') ?? undefined

  const since = sinceParam ? new Date(sinceParam) : null

  const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? '20', 10)))

  const cursorClause = cursor ? { cursor: { id: cursor }, skip: 1 } : {}

  const sessions = await prisma.chatSession.findMany({
    where: since ? { createdAt: { gte: since } } : {},
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...cursorClause,
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true, role: true, createdAt: true },
      },
    },
  })

  const hasNextPage = sessions.length > limit
  const page = sessions.slice(0, limit)
  const nextCursor = hasNextPage ? page[page.length - 1].id : null

  return NextResponse.json({
    sessions: page.map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
      endedAt: s.endedAt,
      endedReason: s.endedReason,
      messageCount: s._count.messages,
      lastMessage: s.messages[0] ?? null,
    })),
    nextCursor,
  })
}
