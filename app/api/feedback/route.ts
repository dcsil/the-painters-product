import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, incrementRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const VALID_CATEGORIES = ['bug', 'feature', 'general'] as const

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { category, message } = body

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message must be 2000 characters or fewer' }, { status: 400 })
  }

  // Rate limit: per-user to prevent DB flooding
  const identifier = `user:${session.user.id}`
  const limitCheck = await checkRateLimit(identifier, 'feedback')
  if (!limitCheck.allowed) {
    const retryAfter = Math.ceil((limitCheck.minuteResetAt.getTime() - Date.now()) / 1000)
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter,
        remaining: { minute: 0, day: limitCheck.remainingDay },
        limits: RATE_LIMITS.feedback,
      },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }
  await incrementRateLimit(identifier, 'feedback')

  await prisma.feedback.create({
    data: {
      userId: session.user.id,
      category,
      message: message.trim(),
    },
  })

  return NextResponse.json({ success: true })
}
