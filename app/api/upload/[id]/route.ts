import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const upload = await prisma.upload.findUnique({
      where: { id },
      include: {
        analyses: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!upload) {
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
