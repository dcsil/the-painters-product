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
    biasThreshold: preferences.biasThreshold,
    termsAcceptedAt: preferences.termsAcceptedAt ?? null,
    termsVersion: preferences.termsVersion ?? null,
  })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { defaultAnalysisMode, defaultAnalyses, alertEmail, biasThreshold, termsAccepted } = body

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

  if (biasThreshold !== undefined) {
    const threshold = Number(biasThreshold)
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
      return NextResponse.json({ error: 'Bias threshold must be an integer between 0 and 100' }, { status: 400 })
    }
  }

  const termsUpdate = termsAccepted === true
    ? { termsAcceptedAt: new Date(), termsVersion: 'alpha-1' }
    : {}

  const preferences = await prisma.userPreferences.upsert({
    where: { userId: session.user.id },
    update: {
      ...(defaultAnalysisMode && { defaultAnalysisMode }),
      ...(defaultAnalyses && { defaultAnalyses }),
      ...(alertEmail !== undefined && { alertEmail: alertEmail || null }),
      ...(biasThreshold !== undefined && { biasThreshold: Number(biasThreshold) }),
      ...termsUpdate,
    },
    create: {
      userId: session.user.id,
      ...(defaultAnalysisMode && { defaultAnalysisMode }),
      ...(defaultAnalyses && { defaultAnalyses }),
      ...(alertEmail !== undefined && { alertEmail: alertEmail || null }),
      ...(biasThreshold !== undefined && { biasThreshold: Number(biasThreshold) }),
      ...termsUpdate,
    },
  })

  return NextResponse.json({
    defaultAnalysisMode: preferences.defaultAnalysisMode,
    defaultAnalyses: preferences.defaultAnalyses,
    alertEmail: preferences.alertEmail ?? '',
    biasThreshold: preferences.biasThreshold,
    termsAcceptedAt: preferences.termsAcceptedAt ?? null,
    termsVersion: preferences.termsVersion ?? null,
  })
}
