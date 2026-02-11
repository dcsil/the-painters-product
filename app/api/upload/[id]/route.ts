import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const upload = await prisma.upload.findUnique({
      where: { id },
      include: {
        analyses: true,
      }
    })

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    if (upload.userId !== session.user.id) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    return NextResponse.json(upload)
  } catch (error) {
    console.error('Error fetching upload:', error)
    return NextResponse.json(
      { error: 'Failed to fetch upload status' },
      { status: 500 }
    )
  }
}
