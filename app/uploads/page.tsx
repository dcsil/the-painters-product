'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Upload {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string
  status: string
  source?: string
  batchId?: string | null
  analyses: { id: string; detectedIssues: number }[]
  chatSession?: { id: string; createdAt: string; endedAt: string | null } | null
}

interface BatchGroup {
  batchId: string
  uploads: Upload[]
  uploadedAt: string  // date of first upload in batch
  totalIssues: number
  allCompleted: boolean
  anyFailed: boolean
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
}

function getBatchStatus(group: BatchGroup): string {
  if (group.anyFailed && !group.allCompleted) return 'failed'
  if (group.allCompleted) return 'completed'
  return 'processing'
}

function SingleUploadCard({ upload }: { upload: Upload }) {
  const isChat = upload.source === 'chat'
  const totalIssues = upload.analyses.reduce((s, a) => s + a.detectedIssues, 0)
  const statusColor = STATUS_COLORS[upload.status] ?? 'bg-gray-100 text-gray-800'

  return (
    <div className="bg-white rounded-md shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-lg font-semibold text-slate-900 truncate">
              {isChat
                ? `Chat session · ${new Date(upload.chatSession?.createdAt ?? upload.uploadedAt).toLocaleDateString()}`
                : upload.fileName}
            </h3>
            {isChat && (
              <span className="px-2.5 py-0.5 rounded-sm text-xs font-semibold tracking-wide uppercase bg-blue-100 text-blue-800">
                Chatbot
              </span>
            )}
            <span className={`px-2.5 py-0.5 rounded-sm text-xs font-semibold tracking-wide uppercase ${statusColor}`}>
              {upload.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {new Date(upload.uploadedAt).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {formatFileSize(upload.fileSize)}
            </span>
            {upload.analyses.length > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {upload.analyses.length} {upload.analyses.length === 1 ? 'analysis' : 'analyses'}
                {totalIssues > 0 && <span className="ml-1 text-slate-900 font-semibold">· {totalIssues} issues</span>}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {upload.status === 'completed' && (
            <Link href={`/dashboard/${upload.id}`} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-md transition-colors">
              View Dashboard
            </Link>
          )}
          {upload.status === 'processing' && (
            <Link href={`/processing/${upload.id}`} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium text-sm rounded-md transition-colors">
              View Progress
            </Link>
          )}
          {upload.status === 'failed' && (
            <Link href="/upload" className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium text-sm rounded-md transition-colors">
              Try Again
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function BatchCard({ group }: { group: BatchGroup }) {
  const [expanded, setExpanded] = useState(false)
  const batchStatus = getBatchStatus(group)
  const statusColor = STATUS_COLORS[batchStatus] ?? 'bg-gray-100 text-gray-800'
  const completedCount = group.uploads.filter(u => u.status === 'completed').length

  return (
    <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Batch header row */}
      <div className="p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-sm text-xs font-semibold tracking-wide uppercase bg-slate-100 text-slate-700">
                Batch
              </span>
              <h3 className="text-lg font-semibold text-slate-900">
                {group.uploads.length} files
              </h3>
              <span className={`px-2.5 py-0.5 rounded-sm text-xs font-semibold tracking-wide uppercase ${statusColor}`}>
                {completedCount}/{group.uploads.length} done
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {new Date(group.uploadedAt).toLocaleString()}
              </span>
              {group.totalIssues > 0 && (
                <span className="font-semibold text-slate-900">{group.totalIssues} total issues</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {batchStatus === 'completed' && (
              <Link
                href={`/batch/${group.batchId}`}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-md transition-colors"
              >
                View Batch Summary
              </Link>
            )}
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-md transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded file list */}
      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {group.uploads.map(upload => {
            const issues = upload.analyses.reduce((s, a) => s + a.detectedIssues, 0)
            const sc = STATUS_COLORS[upload.status] ?? 'bg-gray-100 text-gray-800'
            return (
              <div key={upload.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{upload.fileName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatFileSize(upload.fileSize)}
                    {issues > 0 && <span className="ml-2 text-slate-700 font-medium">{issues} issues</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-sm text-xs font-semibold uppercase ${sc}`}>{upload.status}</span>
                  {upload.status === 'completed' && (
                    <Link href={`/dashboard/${upload.id}`} className="text-xs text-slate-600 hover:text-slate-900 underline">
                      View
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function UploadsPage() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/uploads')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch uploads')
        return res.json()
      })
      .then(setUploads)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading uploads…</p>
        </div>
      </div>
    )
  }

  // Separate batched from non-batched uploads
  const batchMap = new Map<string, Upload[]>()
  const standalone: Upload[] = []

  for (const u of uploads) {
    if (u.batchId) {
      const arr = batchMap.get(u.batchId) ?? []
      arr.push(u)
      batchMap.set(u.batchId, arr)
    } else {
      standalone.push(u)
    }
  }

  // Build batch groups
  const batchGroups: BatchGroup[] = Array.from(batchMap.entries()).map(([batchId, batchUploads]) => {
    const sorted = [...batchUploads].sort(
      (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    )
    const totalIssues = batchUploads.reduce(
      (s, u) => s + u.analyses.reduce((as, a) => as + a.detectedIssues, 0),
      0
    )
    return {
      batchId,
      uploads: sorted,
      uploadedAt: sorted[0].uploadedAt,
      totalIssues,
      allCompleted: batchUploads.every(u => u.status === 'completed'),
      anyFailed: batchUploads.some(u => u.status === 'failed'),
    }
  })

  // Merge standalone and batch groups, sort by date descending
  type ListItem = { date: string; type: 'single'; upload: Upload } | { date: string; type: 'batch'; group: BatchGroup }
  const items: ListItem[] = [
    ...standalone.map(u => ({ date: u.uploadedAt, type: 'single' as const, upload: u })),
    ...batchGroups.map(g => ({ date: g.uploadedAt, type: 'batch' as const, group: g })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-3xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Past Uploads</h1>
              <p className="text-slate-600">View and manage your previous analysis uploads.</p>
            </div>
            <Link href="/upload" className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition-colors shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Upload
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {!error && items.length === 0 && (
          <div className="bg-white rounded-md shadow-sm border border-slate-200 p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No uploads yet</h2>
            <p className="text-slate-600 mb-6">Start analyzing your AI chatbot conversations by uploading a file.</p>
            <Link href="/upload" className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition-colors shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Your First File
            </Link>
          </div>
        )}

        {!error && items.length > 0 && (
          <div className="space-y-4">
            {items.map((item, i) =>
              item.type === 'single'
                ? <SingleUploadCard key={item.upload.id} upload={item.upload} />
                : <BatchCard key={item.group.batchId + i} group={item.group} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
