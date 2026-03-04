'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import TabNavigation from './components/TabNavigation'
import OverviewTab from './components/OverviewTab'
import HallucinationTab from './components/HallucinationTab'
import BiasTab from './components/BiasTab'
import ToxicityTab from './components/ToxicityTab'

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

function groupAnalysesByCategory(analyses: Analysis[]): Record<string, Analysis[]> {
  const groups: Record<string, Analysis[]> = {}
  for (const a of analyses) {
    const category = a.analysisType.split('-')[0]
    if (!groups[category]) groups[category] = []
    groups[category].push(a)
  }
  return groups
}

export default function DashboardPage() {
  const params = useParams()
  const uploadId = params.id as string

  const [upload, setUpload] = useState<Upload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

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

  const grouped = groupAnalysesByCategory(upload.analyses)
  const CATEGORY_ORDER = ['hallucination', 'bias', 'toxicity']
  const availableCategories = CATEGORY_ORDER.filter(cat => cat in grouped)
  const tabs = ['overview', ...availableCategories]
  const effectiveTab = tabs.includes(activeTab) ? activeTab : 'overview'

  return (
    <div className="relative min-h-screen bg-white p-4 overflow-hidden">
      {/* Technical Grid Background & Glow */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(to_bottom,black_10%,transparent_100%)] pointer-events-none"></div>
      <div className="absolute left-0 right-0 top-0 z-0 m-auto h-[300px] w-[600px] rounded-full bg-emerald-500 opacity-10 blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="mb-4">
          <Link href="/uploads" className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-6 text-sm font-medium transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to History
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap pb-6 border-b border-slate-200/60">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Analysis Dashboard</h1>
              <p className="text-slate-500 text-sm mt-2 font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {upload.fileName} &nbsp;·&nbsp; {new Date(upload.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation tabs={tabs} activeTab={effectiveTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {effectiveTab === 'overview' && <OverviewTab groupedAnalyses={grouped} />}
        {effectiveTab === 'hallucination' && grouped.hallucination && <HallucinationTab analyses={grouped.hallucination} />}
        {effectiveTab === 'bias' && grouped.bias && <BiasTab analyses={grouped.bias} />}
        {effectiveTab === 'toxicity' && grouped.toxicity && <ToxicityTab analyses={grouped.toxicity} />}

        {/* Actions */}
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
