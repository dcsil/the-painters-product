'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlaggedTurn {
  turnIndex: number
  assistantContent: string
  issueType: 'SELF_CONTRADICTION' | 'OVERCONFIDENCE' | 'FABRICATED_CITATION' | 'HARDCODED_FACT'
  explanation: string
  confidence: number
  numericalImpact: string | null
}

interface HallucinationResult {
  summary: string
  hallucinationRate: number
  averageConfidence: number
  flaggedTurns: FlaggedTurn[]
  issueBreakdown: {
    SELF_CONTRADICTION: number
    OVERCONFIDENCE: number
    FABRICATED_CITATION: number
    HARDCODED_FACT: number
  }
}

interface Analysis {
  id: string
  analysisType: string
  result: string
  confidence: number
  detectedIssues: number
  createdAt: string
}

interface Upload {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string
  status: string
  analyses: Analysis[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ISSUE_META: Record<string, { label: string; color: string; bg: string; badge: string }> = {
  SELF_CONTRADICTION: {
    label: 'Self-Contradiction',
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
  },
  OVERCONFIDENCE: {
    label: 'Overconfidence',
    color: 'text-orange-700',
    bg: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
  },
  FABRICATED_CITATION: {
    label: 'Fabricated Citation',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700',
  },
  HARDCODED_FACT: {
    label: 'Unverified Fact',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-orange-400' : 'bg-yellow-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-10 text-right">{pct}%</span>
    </div>
  )
}

function FlaggedTurnCard({ turn, index }: { turn: FlaggedTurn; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const meta = ISSUE_META[turn.issueType] ?? ISSUE_META.OVERCONFIDENCE
  const truncated = turn.assistantContent.length > 200 && !expanded

  return (
    <div className={`rounded-lg border p-5 ${meta.bg}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Turn {turn.turnIndex + 1}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>
            {meta.label}
          </span>
          {turn.numericalImpact && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              ⚠ {turn.numericalImpact}
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-gray-600 shrink-0">
          {Math.round(turn.confidence * 100)}% confidence
        </span>
      </div>

      {/* Assistant message */}
      <blockquote className="text-sm text-gray-700 italic border-l-4 border-gray-300 pl-3 mb-3">
        {truncated ? `${turn.assistantContent.substring(0, 200)}…` : turn.assistantContent}
        {turn.assistantContent.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-2 text-blue-600 hover:underline not-italic font-medium"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </blockquote>

      {/* Explanation */}
      <p className={`text-sm font-medium ${meta.color}`}>
        {turn.explanation}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const params = useParams()
  const uploadId = params.id as string

  const [upload, setUpload] = useState<Upload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!uploadId) return
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/upload/${uploadId}`)
        if (!res.ok) throw new Error('Failed to fetch analysis data')
        const data = await res.json()
        setUpload(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [uploadId])

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  // ---- Error state ----
  if (error || !upload) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error ?? 'Upload not found'}</p>
          <Link href="/" className="inline-block py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  // ---- Parse analysis ----
  const hallucinationAnalysis = upload.analyses.find(a => a.analysisType === 'hallucination')
  let result: HallucinationResult | null = null
  if (hallucinationAnalysis) {
    try {
      result = JSON.parse(hallucinationAnalysis.result)
    } catch {
      // malformed result — show raw fallback
    }
  }

  const flaggedCount = result?.flaggedTurns.length ?? 0
  const hallucinationRatePct = result ? Math.round(result.hallucinationRate * 100) : 0
  const avgConfPct = result ? Math.round(result.averageConfidence * 100) : 0
  const breakdown = result?.issueBreakdown ?? {
    SELF_CONTRADICTION: 0,
    OVERCONFIDENCE: 0,
    FABRICATED_CITATION: 0,
    HARDCODED_FACT: 0,
  }

  const isClean = flaggedCount === 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
      <div className="max-w-5xl mx-auto py-8 space-y-8">

        {/* ---- Header ---- */}
        <div>
          <Link href="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4 text-sm font-medium">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hallucination Analysis</h1>
              <p className="text-gray-500 text-sm mt-1">
                {upload.fileName} &nbsp;·&nbsp; {new Date(upload.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${isClean ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {isClean ? '✓ No Issues Found' : `⚠ ${flaggedCount} Issue${flaggedCount !== 1 ? 's' : ''} Detected`}
            </span>
          </div>
        </div>

        {/* ---- Top stats ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Hallucination rate */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Hallucination Rate</p>
            <p className={`text-4xl font-bold ${hallucinationRatePct > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {hallucinationRatePct}%
            </p>
            <p className="text-xs text-gray-400 mt-1">of assistant turns flagged</p>
          </div>

          {/* Avg confidence */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Avg. Detection Confidence</p>
            <p className={`text-4xl font-bold ${avgConfPct >= 70 ? 'text-red-600' : avgConfPct > 0 ? 'text-orange-500' : 'text-green-600'}`}>
              {avgConfPct}%
            </p>
            <p className="text-xs text-gray-400 mt-1">across flagged turns</p>
          </div>

          {/* Flagged turns */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Flagged Turns</p>
            <p className={`text-4xl font-bold ${flaggedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {flaggedCount}
            </p>
            <p className="text-xs text-gray-400 mt-1">assistant turns with issues</p>
          </div>
        </div>

        {/* ---- Issue breakdown ---- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Issue Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(Object.keys(ISSUE_META) as (keyof typeof ISSUE_META)[]).map(key => (
              <div key={key} className={`rounded-lg border p-4 ${ISSUE_META[key].bg}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${ISSUE_META[key].color}`}>
                  {ISSUE_META[key].label}
                </p>
                <p className="text-3xl font-bold text-gray-900">{breakdown[key as keyof typeof breakdown]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Summary ---- */}
        {result?.summary && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Summary</h2>
            <p className="text-gray-700 leading-relaxed">{result.summary}</p>
          </div>
        )}

        {/* ---- Flagged turns ---- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Flagged Turns
            {flaggedCount > 0 && (
              <span className="ml-2 text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {flaggedCount}
              </span>
            )}
          </h2>

          {isClean ? (
            <div className="text-center py-10 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-green-600">No hallucinations detected in this conversation.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {result?.flaggedTurns.map((turn, i) => (
                <FlaggedTurnCard key={i} turn={turn} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* ---- Confidence bar (only when issues exist) ---- */}
        {!isClean && result && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Confidence per Flagged Turn</h2>
            <div className="space-y-3">
              {result.flaggedTurns.map((turn, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-14 shrink-0">Turn {turn.turnIndex + 1}</span>
                  <div className="flex-1">
                    <ConfidenceBar value={turn.confidence} />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ISSUE_META[turn.issueType]?.badge ?? ''}`}>
                    {ISSUE_META[turn.issueType]?.label ?? turn.issueType}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- Actions ---- */}
        <div className="flex gap-3 flex-wrap">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Analyze Another File
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg shadow-sm transition-colors border border-gray-200 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Export Report
          </button>
        </div>

      </div>
    </div>
  )
}
