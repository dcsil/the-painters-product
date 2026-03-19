import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { batchId } = await params

    const uploads = await prisma.upload.findMany({
      where: {
        batchId,
        userId: session.user.id,
      },
      include: {
        analyses: true,
      },
      orderBy: { uploadedAt: 'asc' },
    })

    if (uploads.length === 0) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json({ uploads })
  } catch (error) {
    console.error('Error fetching batch:', error)
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 })
  }
}
