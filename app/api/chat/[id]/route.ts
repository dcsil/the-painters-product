import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('[chat/id] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
