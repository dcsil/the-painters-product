import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const preferences = await prisma.userPreferences.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  })

  return NextResponse.json({
    defaultAnalysisMode: preferences.defaultAnalysisMode,
    defaultAnalyses: preferences.defaultAnalyses,
    alertEmail: preferences.alertEmail ?? '',
  })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { defaultAnalysisMode, defaultAnalyses, alertEmail } = body

  const validModes = ['gemini', 'groq', 'both']
  if (defaultAnalysisMode && !validModes.includes(defaultAnalysisMode)) {
    return NextResponse.json({ error: 'Invalid analysis mode' }, { status: 400 })
  }

  const validAnalyses = ['hallucination', 'bias', 'toxicity']
  if (defaultAnalyses) {
    const analyses = defaultAnalyses.split(',')
    if (analyses.some((a: string) => !validAnalyses.includes(a)) || analyses.length === 0) {
      return NextResponse.json({ error: 'Invalid analysis types' }, { status: 400 })
    }
  }

  if (alertEmail !== undefined && alertEmail !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(alertEmail)) {
      return NextResponse.json({ error: 'Invalid alert email address' }, { status: 400 })
    }
  }

  const preferences = await prisma.userPreferences.upsert({
    where: { userId: session.user.id },
    update: {
      ...(defaultAnalysisMode && { defaultAnalysisMode }),
      ...(defaultAnalyses && { defaultAnalyses }),
      ...(alertEmail !== undefined && { alertEmail: alertEmail || null }),
    },
    create: {
      userId: session.user.id,
      ...(defaultAnalysisMode && { defaultAnalysisMode }),
      ...(defaultAnalyses && { defaultAnalyses }),
      ...(alertEmail !== undefined && { alertEmail: alertEmail || null }),
    },
  })

  return NextResponse.json({
    defaultAnalysisMode: preferences.defaultAnalysisMode,
    defaultAnalyses: preferences.defaultAnalyses,
    alertEmail: preferences.alertEmail ?? '',
  })
}
