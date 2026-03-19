'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Analysis {
  id: string
  analysisType: string
  result: string
  confidence: number | null
  detectedIssues: number
}

interface Upload {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string
  status: string
  analyses: Analysis[]
}

interface IssueBreakdown {
  [key: string]: number
}

interface CategorySummary {
  issues: number
  breakdown: IssueBreakdown
}

interface UploadSummary {
  upload: Upload
  totalIssues: number
  hallucination: number
  bias: number
  toxicity: number
}

function getPreferredAnalysis(analyses: Analysis[], category: string): Analysis | null {
  const order = [`${category}-both`, `${category}-gemini`, `${category}-groq`]
  for (const type of order) {
    const found = analyses.find(a => a.analysisType === type)
    if (found) return found
  }
  // Fallback: any analysis that starts with the category
  return analyses.find(a => a.analysisType.startsWith(category)) ?? null
}

function parseBreakdown(analysis: Analysis | null): IssueBreakdown {
  if (!analysis) return {}
  try {
    const result = JSON.parse(analysis.result)
    return result.issueBreakdown ?? {}
  } catch {
    return {}
  }
}

function computeUploadSummary(upload: Upload): UploadSummary {
  const categories = ['hallucination', 'bias', 'toxicity']
  const counts: Record<string, number> = {}
  for (const cat of categories) {
    const a = getPreferredAnalysis(upload.analyses, cat)
    counts[cat] = a?.detectedIssues ?? 0
  }
  return {
    upload,
    totalIssues: counts.hallucination + counts.bias + counts.toxicity,
    hallucination: counts.hallucination,
    bias: counts.bias,
    toxicity: counts.toxicity,
  }
}

function mergeBreakdowns(summaries: UploadSummary[], category: string): IssueBreakdown {
  const merged: IssueBreakdown = {}
  for (const s of summaries) {
    const a = getPreferredAnalysis(s.upload.analyses, category)
    const bd = parseBreakdown(a)
    for (const [k, v] of Object.entries(bd)) {
      merged[k] = (merged[k] ?? 0) + v
    }
  }
  return merged
}

const CATEGORY_COLORS: Record<string, string> = {
  hallucination: 'text-red-700 bg-red-50 border-red-200',
  bias: 'text-amber-700 bg-amber-50 border-amber-200',
  toxicity: 'text-purple-700 bg-purple-50 border-purple-200',
}

const CATEGORY_LABELS: Record<string, string> = {
  hallucination: 'Hallucination',
  bias: 'Bias',
  toxicity: 'Toxicity',
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function SubtypeCard({ category, breakdown }: { category: string; breakdown: IssueBreakdown }) {
  const colorClass = CATEGORY_COLORS[category] ?? 'text-slate-700 bg-slate-50 border-slate-200'
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0)

  return (
    <div className={`rounded-md border p-4 ${colorClass}`}>
      <h3 className="text-sm font-semibold mb-3">{CATEGORY_LABELS[category] ?? category} Subtypes</h3>
      {entries.length === 0 ? (
        <p className="text-sm opacity-60">No issues detected</p>
      ) : (
        <ul className="space-y-2">
          {entries.map(([subtype, count]) => (
            <li key={subtype} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="font-medium">{subtype.replace(/_/g, ' ')}</span>
                  <span>{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-black/10">
                  <div
                    className="h-1.5 rounded-full bg-current opacity-60"
                    style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function BatchPage() {
  const { batchId } = useParams<{ batchId: string }>()
  const [uploads, setUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!batchId) return
    fetch(`/api/batch/${batchId}`)
      .then(res => {
        if (!res.ok) throw new Error('Batch not found')
        return res.json()
      })
      .then(data => {
        setUploads(data.uploads ?? [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [batchId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading batch results…</p>
        </div>
      </div>
    )
  }

  if (error || uploads.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">{error ?? 'Batch not found'}</p>
          <Link href="/upload" className="text-slate-900 underline">Back to Upload</Link>
        </div>
      </div>
    )
  }

  const summaries = uploads.map(computeUploadSummary)
  summaries.sort((a, b) => b.totalIssues - a.totalIssues)

  const completedCount = uploads.filter(u => u.status === 'completed').length
  const totalIssues = summaries.reduce((s, u) => s + u.totalIssues, 0)
  const worstOffender = summaries[0]
  const withIssues = summaries.filter(s => s.totalIssues > 0).length
  const detectionRate = uploads.length > 0 ? Math.round((withIssues / uploads.length) * 100) : 0

  const hallucinationBreakdown = mergeBreakdowns(summaries, 'hallucination')
  const biasBreakdown = mergeBreakdowns(summaries, 'bias')
  const toxicityBreakdown = mergeBreakdowns(summaries, 'toxicity')

  const categoryTotals: CategorySummary = {
    issues: totalIssues,
    breakdown: {},
  }
  const mostIssuesCat = (['hallucination', 'bias', 'toxicity'] as const).reduce(
    (best, cat) => {
      const total = summaries.reduce((s, u) => s + (cat === 'hallucination' ? u.hallucination : cat === 'bias' ? u.bias : u.toxicity), 0)
      return total > best.count ? { cat, count: total } : best
    },
    { cat: 'hallucination' as string, count: -1 }
  )

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-5xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/upload" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Upload
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">
            Batch Analysis
          </h1>
          <p className="text-slate-600">
            {completedCount} of {uploads.length} conversation{uploads.length !== 1 ? 's' : ''} analyzed
            · {new Date(uploads[0].uploadedAt).toLocaleDateString()}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-md border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Files</p>
            <p className="text-2xl font-bold text-slate-900">{uploads.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">{completedCount} completed</p>
          </div>
          <div className="bg-white rounded-md border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Issues</p>
            <p className="text-2xl font-bold text-slate-900">{totalIssues}</p>
            <p className="text-xs text-slate-500 mt-0.5">across all files</p>
          </div>
          <div className="bg-white rounded-md border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Most Flagged</p>
            <p className="text-2xl font-bold text-slate-900 capitalize">
              {mostIssuesCat.count > 0 ? mostIssuesCat.cat : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {mostIssuesCat.count > 0 ? `${mostIssuesCat.count} issues` : 'no issues'}
            </p>
          </div>
          <div className="bg-white rounded-md border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Detection Rate</p>
            <p className="text-2xl font-bold text-slate-900">{detectionRate}%</p>
            <p className="text-xs text-slate-500 mt-0.5">files with ≥1 issue</p>
          </div>
        </div>

        {/* Per-file Results Table */}
        <div className="bg-white rounded-md border border-slate-200 shadow-sm mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Results by File</h2>
            <p className="text-sm text-slate-500 mt-0.5">Sorted by total issues — click View Details to see full analysis</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">File</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-red-500 uppercase tracking-wide">Hallucinations</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-amber-500 uppercase tracking-wide">Bias</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-purple-500 uppercase tracking-wide">Toxicity</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaries.map(({ upload, totalIssues: total, hallucination, bias, toxicity }) => (
                  <tr key={upload.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900 truncate max-w-xs">{upload.fileName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatFileSize(upload.fileSize)}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-semibold ${hallucination > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {hallucination}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-semibold ${bias > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {bias}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-semibold ${toxicity > 0 ? 'text-purple-600' : 'text-slate-400'}`}>
                        {toxicity}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-bold text-base ${total > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                        {total}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {upload.status === 'completed' ? (
                        <Link
                          href={`/dashboard/${upload.id}`}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors"
                        >
                          View Details
                        </Link>
                      ) : (
                        <span className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-md capitalize">
                          {upload.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aggregate Subtype Breakdown */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-3">Aggregate Issue Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SubtypeCard category="hallucination" breakdown={hallucinationBreakdown} />
            <SubtypeCard category="bias" breakdown={biasBreakdown} />
            <SubtypeCard category="toxicity" breakdown={toxicityBreakdown} />
          </div>
        </div>

        {/* Worst offender callout */}
        {worstOffender && worstOffender.totalIssues > 0 && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-900">Worst offender</p>
              <p className="text-sm text-amber-800 mt-0.5 truncate max-w-md">
                {worstOffender.upload.fileName} — {worstOffender.totalIssues} issue{worstOffender.totalIssues !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href={`/dashboard/${worstOffender.upload.id}`}
              className="shrink-0 px-4 py-2 bg-amber-900 hover:bg-amber-800 text-white text-sm font-medium rounded-md transition-colors"
            >
              View Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
