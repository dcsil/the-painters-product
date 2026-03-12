import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const uploads = await prisma.upload.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { source: 'chat' },
        ],
      },
      include: {
        analyses: true,
        chatSession: { select: { id: true, createdAt: true, endedAt: true } },
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    return NextResponse.json(uploads)
  } catch (error) {
    console.error('Error fetching uploads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch uploads' },
      { status: 500 }
    )
  }
}
