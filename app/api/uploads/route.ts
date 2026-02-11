import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const uploads = await prisma.upload.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        analyses: true
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
