import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const groundTruth = await prisma.groundTruth.findUnique({
    where: { id },
    select: { id: true, name: true, content: true, fileType: true, isBuiltIn: true, createdAt: true, userId: true },
  })

  if (!groundTruth) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Built-ins are accessible to all authenticated users; user-owned only to their owner
  if (!groundTruth.isBuiltIn && groundTruth.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(groundTruth)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const groundTruth = await prisma.groundTruth.findUnique({ where: { id } })

  if (!groundTruth) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (groundTruth.isBuiltIn) {
    return NextResponse.json({ error: 'Cannot delete built-in ground truths' }, { status: 403 })
  }

  if (groundTruth.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.groundTruth.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
