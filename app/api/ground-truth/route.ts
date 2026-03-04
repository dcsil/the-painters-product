import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { seedBuiltInGroundTruths } from '@/lib/ground-truth-seed'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ensure built-in ground truths exist
  await seedBuiltInGroundTruths()

  const groundTruths = await prisma.groundTruth.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { isBuiltIn: true },
      ],
    },
    select: {
      id: true,
      name: true,
      fileType: true,
      isBuiltIn: true,
      createdAt: true,
      userId: true,
    },
    orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(groundTruths)
}

const MAX_FILE_SIZE = 100 * 1024 // 100KB

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const name = formData.get('name') as string | null

  if (!file || !name?.trim()) {
    return NextResponse.json({ error: 'File and name are required' }, { status: 400 })
  }

  // Validate file type
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !['txt', 'md', 'json'].includes(ext)) {
    return NextResponse.json({ error: 'File must be .txt, .md, or .json' }, { status: 400 })
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File must be under 100KB' }, { status: 400 })
  }

  const content = await file.text()

  const groundTruth = await prisma.groundTruth.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      content,
      fileType: ext,
    },
  })

  return NextResponse.json({ id: groundTruth.id, name: groundTruth.name }, { status: 201 })
}
