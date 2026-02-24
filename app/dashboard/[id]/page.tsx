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
    color: 'text-slate-800',
    bg: 'bg-white border-l-4 border-l-purple-500 border-t-slate-200 border-r-slate-200 border-b-slate-200',
    badge: 'bg-purple-50 text-purple-700 border border-purple-200',
  },
  OVERCONFIDENCE: {
    label: 'Overconfidence',
    color: 'text-slate-800',
    bg: 'bg-white border-l-4 border-l-amber-500 border-t-slate-200 border-r-slate-200 border-b-slate-200',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  FABRICATED_CITATION: {
    label: 'Fabricated Citation',
    color: 'text-slate-800',
    bg: 'bg-white border-l-4 border-l-red-500 border-t-slate-200 border-r-slate-200 border-b-slate-200',
    badge: 'bg-red-50 text-red-700 border border-red-200',
  },
  HARDCODED_FACT: {
    label: 'Unverified Fact',
    color: 'text-slate-800',
    bg: 'bg-white border-l-4 border-l-blue-500 border-t-slate-200 border-r-slate-200 border-b-slate-200',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-100 rounded-sm h-1.5 overflow-hidden">
        <div className={`${color} h-1.5 transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-8 text-right">{pct}%</span>
    </div>
  )
}

function FlaggedTurnCard({ turn, index }: { turn: FlaggedTurn; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const meta = ISSUE_META[turn.issueType] ?? ISSUE_META.OVERCONFIDENCE
  const truncated = turn.assistantContent.length > 200 && !expanded

  return (
    <div className={`rounded-md border shadow-sm p-5 ${meta.bg}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Turn {turn.turnIndex + 1}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${meta.badge}`}>
            {meta.label}
          </span>
          {turn.numericalImpact && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-200">
              Impact: {turn.numericalImpact}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-slate-500 shrink-0">
          Confidence: <span className="text-slate-900 font-semibold">{Math.round(turn.confidence * 100)}%</span>
        </span>
      </div>

      {/* Assistant message */}
      <blockquote className="text-sm text-slate-700 italic border-l-2 border-slate-300 pl-4 mb-4 bg-slate-50 py-2 pr-2 rounded-r-md">
        {truncated ? `${turn.assistantContent.substring(0, 200)}…` : turn.assistantContent}
        {turn.assistantContent.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-2 text-slate-900 hover:text-slate-600 underline underline-offset-2 not-italic font-medium"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </blockquote>

      {/* Explanation */}
      <div className={`text-sm text-slate-800`}>
        <span className="font-semibold text-slate-900 mr-2">Analysis:</span>
        {turn.explanation}
      </div>
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  // ---- Error state ----
  if (error || !upload) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-md border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <svg className="w-16 h-16 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-600 mb-6">{error ?? 'Upload not found'}</p>
          <Link href="/" className="inline-block py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition-colors">
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
    <div className="relative min-h-screen bg-white p-4 overflow-hidden">
      {/* Technical Grid Background & Glow */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(to_bottom,black_10%,transparent_100%)] pointer-events-none"></div>
      <div className="absolute left-0 right-0 top-0 z-0 m-auto h-[300px] w-[#600px] rounded-full bg-emerald-500 opacity-10 blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto py-8 space-y-8">

        {/* ---- Header ---- */}
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-6 text-sm font-medium transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap pb-6 border-b border-slate-200/60">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Hallucination Analysis</h1>
              <p className="text-slate-500 text-sm mt-2 font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {upload.fileName} &nbsp;·&nbsp; {new Date(upload.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-md shadow-sm font-semibold tracking-wide border ${isClean ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
              <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isClean ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isClean ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              </span>
              {isClean ? 'NO ISSUES DETECTED' : `${flaggedCount} ISSUE${flaggedCount !== 1 ? 'S' : ''} DETECTED`}
            </div>
          </div>
        </div>

        {/* ---- Top stats ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Hallucination rate */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-6 flex flex-col justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Hallucination Rate</p>
            <p className={`text-4xl font-extrabold tracking-tight ${hallucinationRatePct > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {hallucinationRatePct}%
            </p>
            <p className="text-sm text-slate-500 mt-2 font-medium">of assistant turns flagged</p>
          </div>

          {/* Avg confidence */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-6 flex flex-col justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Conf. Averaging</p>
            <p className={`text-4xl font-extrabold tracking-tight ${avgConfPct >= 70 ? 'text-red-600' : avgConfPct > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
              {avgConfPct}%
            </p>
            <p className="text-sm text-slate-500 mt-2 font-medium">across flagged turns</p>
          </div>

          {/* Flagged turns */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-6 flex flex-col justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Flagged Turns</p>
            <p className={`text-4xl font-extrabold tracking-tight ${flaggedCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {flaggedCount}
            </p>
            <p className="text-sm text-slate-500 mt-2 font-medium">assistant turns with issues</p>
          </div>
        </div>

        {/* ---- Issue breakdown ---- */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-8">
          <h2 className="text-xs font-bold text-slate-900 mb-6 uppercase tracking-widest">Diagnostic Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.keys(ISSUE_META) as (keyof typeof ISSUE_META)[]).map(key => (
              <div key={key} className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm`}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 text-slate-500`}>
                  {ISSUE_META[key].label}
                </p>
                <p className="text-3xl font-extrabold text-slate-900">{breakdown[key as keyof typeof breakdown]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Summary ---- */}
        {result?.summary && (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-8">
            <h2 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-widest">Executive Summary</h2>
            <p className="text-slate-700 leading-relaxed text-sm lg:text-base font-medium">{result.summary}</p>
          </div>
        )}

        {/* ---- Flagged turns ---- */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-8">
          <h2 className="text-xs font-bold text-slate-900 mb-6 uppercase tracking-widest flex items-center">
            Flagged Turns Log
            {flaggedCount > 0 && (
               <span className="ml-3 text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-md">
                {flaggedCount} Found
              </span>
            )}
          </h2>

          {isClean ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm">
              <svg className="w-12 h-12 mx-auto mb-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-emerald-700">Audit completed. No hallucinations detected in this conversation.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {result?.flaggedTurns.map((turn, i) => (
                <FlaggedTurnCard key={i} turn={turn} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* ---- Confidence bar (only when issues exist) ---- */}
        {!isClean && result && (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-8">
            <h2 className="text-xs font-bold text-slate-900 mb-6 uppercase tracking-widest">Confidence per Flagged Turn</h2>
            <div className="space-y-4">
              {result.flaggedTurns.map((turn, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-xs text-slate-500 w-16 shrink-0 font-bold uppercase tracking-widest">Turn {turn.turnIndex + 1}</span>
                  <div className="flex-1">
                    <ConfidenceBar value={turn.confidence} />
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded border ${ISSUE_META[turn.issueType]?.badge ?? ''}`}>
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
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md shadow-sm transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Analyze Another File
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-md shadow-sm transition-colors border border-slate-200 text-sm"
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
