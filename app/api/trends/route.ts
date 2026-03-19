import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { HallucinationAnalysisResult, BiasAnalysisResult, ToxicityAnalysisResult } from '@/lib/analysis-types'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30', 10), 1), 365)

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Also fetch the prior period for trend comparison
  const priorSince = new Date(since)
  priorSince.setDate(priorSince.getDate() - days)

  const uploads = await prisma.upload.findMany({
    where: {
      userId: session.user.id,
      status: 'completed',
      uploadedAt: { gte: priorSince },
    },
    include: { analyses: true },
    orderBy: { uploadedAt: 'asc' },
  })

  const currentUploads = uploads.filter(u => u.uploadedAt >= since)
  const priorUploads = uploads.filter(u => u.uploadedAt < since)

  // --- Build daily buckets for the current period ---
  const buckets: Record<string, {
    uploadCount: number
    totalIssues: number
    hallucinationIssues: number
    biasIssues: number
    toxicityIssues: number
  }> = {}

  // Pre-fill every day in range with zeros
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    buckets[d.toISOString().slice(0, 10)] = {
      uploadCount: 0, totalIssues: 0,
      hallucinationIssues: 0, biasIssues: 0, toxicityIssues: 0,
    }
  }

  for (const upload of currentUploads) {
    const date = upload.uploadedAt.toISOString().slice(0, 10)
    if (!buckets[date]) continue
    buckets[date].uploadCount++
    for (const analysis of upload.analyses) {
      const issues = analysis.detectedIssues ?? 0
      buckets[date].totalIssues += issues
      if (analysis.analysisType.startsWith('hallucination')) buckets[date].hallucinationIssues += issues
      else if (analysis.analysisType.startsWith('bias')) buckets[date].biasIssues += issues
      else if (analysis.analysisType.startsWith('toxicity')) buckets[date].toxicityIssues += issues
    }
  }

  const dailyData = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  // --- Subtype breakdown across all current uploads ---
  const subtypeBreakdown = {
    hallucination: { SELF_CONTRADICTION: 0, OVERCONFIDENCE: 0, FABRICATED_CITATION: 0, HARDCODED_FACT: 0 } as Record<string, number>,
    bias: { GENDER_BIAS: 0, RACIAL_BIAS: 0, AGE_BIAS: 0, STEREOTYPING: 0 } as Record<string, number>,
    toxicity: { HOSTILE_LANGUAGE: 0, CONDESCENSION: 0, INAPPROPRIATE_CONTENT: 0, PROFANITY: 0 } as Record<string, number>,
  }

  for (const upload of currentUploads) {
    for (const analysis of upload.analyses) {
      try {
        const result = JSON.parse(analysis.result)
        if (analysis.analysisType.startsWith('hallucination')) {
          const r = result as HallucinationAnalysisResult
          for (const [k, v] of Object.entries(r.issueBreakdown ?? {})) {
            subtypeBreakdown.hallucination[k] = (subtypeBreakdown.hallucination[k] ?? 0) + (v as number)
          }
        } else if (analysis.analysisType.startsWith('bias')) {
          const r = result as BiasAnalysisResult
          for (const [k, v] of Object.entries(r.issueBreakdown ?? {})) {
            subtypeBreakdown.bias[k] = (subtypeBreakdown.bias[k] ?? 0) + (v as number)
          }
        } else if (analysis.analysisType.startsWith('toxicity')) {
          const r = result as ToxicityAnalysisResult
          for (const [k, v] of Object.entries(r.issueBreakdown ?? {})) {
            subtypeBreakdown.toxicity[k] = (subtypeBreakdown.toxicity[k] ?? 0) + (v as number)
          }
        }
      } catch {
        // skip malformed result JSON
      }
    }
  }

  // --- Totals for current period ---
  const flaggedByCategory = (uploads: typeof currentUploads, category: string) =>
    uploads.filter(u => u.analyses.some(a => a.analysisType.startsWith(category) && (a.detectedIssues ?? 0) > 0)).length

  const totalUploads = currentUploads.length
  const totalIssues = currentUploads.reduce((s, u) => s + u.analyses.reduce((a, x) => a + (x.detectedIssues ?? 0), 0), 0)
  const priorIssues = priorUploads.reduce((s, u) => s + u.analyses.reduce((a, x) => a + (x.detectedIssues ?? 0), 0), 0)

  const totals = {
    uploads: totalUploads,
    issues: totalIssues,
    priorIssues,
    hallucinationRate: totalUploads > 0 ? Math.round((flaggedByCategory(currentUploads, 'hallucination') / totalUploads) * 100) : 0,
    biasRate: totalUploads > 0 ? Math.round((flaggedByCategory(currentUploads, 'bias') / totalUploads) * 100) : 0,
    toxicityRate: totalUploads > 0 ? Math.round((flaggedByCategory(currentUploads, 'toxicity') / totalUploads) * 100) : 0,
  }

  return NextResponse.json({ dailyData, subtypeBreakdown, totals })
}
