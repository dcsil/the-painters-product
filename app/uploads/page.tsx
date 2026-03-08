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
  analyses: any[]
  chatSession?: { id: string; createdAt: string; endedAt: string | null } | null
}

export default function UploadsPage() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUploads = async () => {
      try {
        const response = await fetch('/api/uploads')
        
        if (!response.ok) {
          throw new Error('Failed to fetch uploads')
        }

        const data = await response.json()
        setUploads(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchUploads()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading uploads...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-5xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-4 font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                Past Uploads
              </h1>
              <p className="text-slate-600">
                View and manage your previous analysis uploads.
              </p>
            </div>
            <Link
              href="/upload"
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Upload
            </Link>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!error && uploads.length === 0 && (
          <div className="bg-white rounded-md shadow-sm border border-slate-200 p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              No uploads yet
            </h2>
            <p className="text-slate-600 mb-6">
              Start analyzing your AI chatbot conversations by uploading a file.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Your First File
            </Link>
          </div>
        )}

        {/* Uploads List */}
        {!error && uploads.length > 0 && (
          <div className="space-y-4">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="bg-white rounded-md shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {upload.source === 'chat'
                          ? `Chat session · ${new Date(upload.chatSession?.createdAt ?? upload.uploadedAt).toLocaleDateString()}`
                          : upload.fileName}
                      </h3>
                      {upload.source === 'chat' && (
                        <span className="px-2.5 py-0.5 rounded-sm text-xs font-semibold tracking-wide uppercase bg-blue-100 text-blue-800">
                          Chatbot
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-sm text-xs font-semibold tracking-wide uppercase ${getStatusColor(upload.status)}`}>
                        {upload.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(upload.uploadedAt).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        {formatFileSize(upload.fileSize)}
                      </div>
                      {upload.analyses.length > 0 && (
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {upload.analyses.length} {upload.analyses.length === 1 ? 'analysis' : 'analyses'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {upload.status === 'completed' && (
                      <Link
                        href={`/dashboard/${upload.id}`}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-md transition-colors"
                      >
                        View Dashboard
                      </Link>
                    )}
                    {upload.status === 'processing' && (
                      <Link
                        href={`/processing/${upload.id}`}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium text-sm rounded-md transition-colors"
                      >
                        View Progress
                      </Link>
                    )}
                    {upload.status === 'failed' && (
                      <Link
                        href="/upload"
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium text-sm rounded-md transition-colors"
                      >
                        Try Again
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
