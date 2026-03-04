'use client'

import { useState } from 'react'
import type { HallucinationAnalysisResult, FlaggedTurn } from '@/lib/analysis-types'
import ProviderSelector from './ProviderSelector'

interface Analysis {
  analysisType: string
  result: string
}

const ISSUE_META: Record<string, { label: string; bg: string; badge: string }> = {
  SELF_CONTRADICTION: {
    label: 'Self-Contradiction',
    bg: 'bg-white border-l-4 border-l-purple-500 border-t-slate-200 border-r-slate-200 border-b-slate-200',
    badge: 'bg-purple-50 text-purple-700 border border-purple-200',
  },
  OVERCONFIDENCE: {
    label: 'Overconfidence',
    bg: 'bg-white border-l-4 border-l-amber-500 border-t-slate-200 border-r-slate-200 border-b-slate-200',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  FABRICATED_CITATION: {
    label: 'Fabricated Citation',
    bg: 'bg-white border-l-4 border-l-red-500 border-t-slate-200 border-r-slate-200 border-b-slate-200',
    badge: 'bg-red-50 text-red-700 border border-red-200',
  },
  HARDCODED_FACT: {
    label: 'Unverified Fact',
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

function FlaggedTurnCard({ turn }: { turn: FlaggedTurn }) {
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
      <div className="text-sm text-slate-800">
        <span className="font-semibold text-slate-900 mr-2">Analysis:</span>
        {turn.explanation}
      </div>
    </div>
  )
}

export default function HallucinationTab({ analyses }: { analyses: Analysis[] }) {
  const [selectedProvider, setSelectedProvider] = useState('')

  const preferredDefault = (
    analyses.find(a => a.analysisType.endsWith('-both')) ??
    analyses.find(a => a.analysisType.endsWith('-gemini')) ??
    analyses.find(a => a.analysisType.endsWith('-groq')) ??
    analyses[0]
  )?.analysisType ?? ''

  const effectiveType = selectedProvider && analyses.some(a => a.analysisType === selectedProvider)
    ? selectedProvider
    : preferredDefault
  const analysis = analyses.find(a => a.analysisType === effectiveType) ?? analyses[0]

  let result: HallucinationAnalysisResult | null = null
  if (analysis) {
    try { result = JSON.parse(analysis.result) } catch {}
  }

  const flaggedCount = result?.flaggedTurns?.length ?? 0
  const ratePct = result ? Math.round(result.hallucinationRate * 100) : 0
  const avgConfPct = result ? (flaggedCount === 0 ? 100 : Math.round(result.averageConfidence * 100)) : 0
  const breakdown = result?.issueBreakdown ?? { SELF_CONTRADICTION: 0, OVERCONFIDENCE: 0, FABRICATED_CITATION: 0, HARDCODED_FACT: 0 }
  const isClean = flaggedCount === 0

  return (
    <div className="space-y-8">
      <ProviderSelector analyses={analyses} selected={effectiveType} onSelect={setSelectedProvider} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Hallucination Rate</p>
          <p className={`text-4xl font-extrabold tracking-tight ${ratePct > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{ratePct}%</p>
          <p className="text-sm text-slate-500 mt-2 font-medium">of assistant turns flagged</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Avg. Confidence</p>
          <p className={`text-4xl font-extrabold tracking-tight ${isClean ? 'text-emerald-600' : avgConfPct >= 70 ? 'text-red-600' : 'text-amber-500'}`}>{avgConfPct}%</p>
          <p className="text-sm text-slate-500 mt-2 font-medium">across flagged turns</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Flagged Turns</p>
          <p className={`text-4xl font-extrabold tracking-tight ${flaggedCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{flaggedCount}</p>
          <p className="text-sm text-slate-500 mt-2 font-medium">assistant turns with issues</p>
        </div>
      </div>

      {/* Issue Breakdown */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-8">
        <h2 className="text-xs font-bold text-slate-900 mb-6 uppercase tracking-widest">Diagnostic Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(ISSUE_META).map(([key, meta]) => (
            <div key={key} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest mb-2 text-slate-500">{meta.label}</p>
              <p className="text-3xl font-extrabold text-slate-900">{breakdown[key as keyof typeof breakdown] ?? 0}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {result?.summary && (
        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-8">
          <h2 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-widest">Executive Summary</h2>
          <p className="text-slate-700 leading-relaxed text-sm lg:text-base font-medium">{result.summary}</p>
        </div>
      )}

      {/* Flagged Turns */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-8">
        <h2 className="text-xs font-bold text-slate-900 mb-6 uppercase tracking-widest flex items-center">
          Flagged Turns Log
          {flaggedCount > 0 && (
            <span className="ml-3 text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-md">{flaggedCount} Found</span>
          )}
        </h2>
        {isClean ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm">
            <svg className="w-12 h-12 mx-auto mb-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-semibold text-emerald-700">No hallucinations detected.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {result?.flaggedTurns.map((turn, i) => (
              <FlaggedTurnCard key={i} turn={turn} />
            ))}
          </div>
        )}
      </div>

      {/* Confidence Bars */}
      {!isClean && result && (
        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-8">
          <h2 className="text-xs font-bold text-slate-900 mb-6 uppercase tracking-widest">Confidence per Flagged Turn</h2>
          <div className="space-y-4">
            {result.flaggedTurns.map((turn, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-xs text-slate-500 w-16 shrink-0 font-bold uppercase tracking-widest">Turn {turn.turnIndex + 1}</span>
                <div className="flex-1"><ConfidenceBar value={turn.confidence} /></div>
                <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded border ${ISSUE_META[turn.issueType]?.badge ?? ''}`}>
                  {ISSUE_META[turn.issueType]?.label ?? turn.issueType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
