'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface GroundTruthItem {
  id: string
  name: string
  fileType: string
  isBuiltIn: boolean
  createdAt: string
}

interface ViewingItem {
  name: string
  content: string
  fileType: string
}

const MIME_TYPES: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
}

export default function GroundTruthPage() {
  const [items, setItems] = useState<GroundTruthItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewingItem, setViewingItem] = useState<ViewingItem | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const fetchItems = async () => {
    const res = await fetch('/api/ground-truth')
    if (res.ok) {
      setItems(await res.json())
    }
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const handleUpload = async () => {
    if (!file || !name.trim()) {
      setError('Please provide both a name and a file')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', name.trim())

      const res = await fetch('/api/ground-truth', { method: 'POST', body: formData })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      setName('')
      setFile(null)
      await fetchItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/ground-truth/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setItems(prev => prev.filter(item => item.id !== id))
    }
  }

  const handleView = async (id: string) => {
    setViewLoading(true)
    try {
      const res = await fetch(`/api/ground-truth/${id}`)
      if (res.ok) {
        const data = await res.json()
        setViewingItem({ name: data.name, content: data.content, fileType: data.fileType })
      }
    } finally {
      setViewLoading(false)
    }
  }

  const handleDownload = (item: ViewingItem) => {
    const mime = MIME_TYPES[item.fileType] ?? 'text/plain'
    const blob = new Blob([item.content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.name}.${item.fileType}`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-slate-900 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-3xl mx-auto py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Ground Truth Knowledge</h1>
          <p className="text-slate-600">
            Upload reference documents with verified facts. These are used to ground analysis in real-world truth.
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Upload New Ground Truth</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Acme Corp Product Facts"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">File (.txt, .md, or .json)</label>
              <input
                type="file"
                accept=".txt,.md,.json"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
              <p className="mt-1 text-xs text-slate-500">Max 100KB. Content is injected into analysis prompts.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || !file || !name.trim()}
              className="px-6 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-md shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Your Ground Truths</h2>
          </div>

          {items.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p>No ground truths yet. Upload one above or use a built-in one during analysis.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {items.map(item => (
                <li key={item.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{item.name}</span>
                        {item.isBuiltIn && (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                            Built-in
                          </span>
                        )}
                        <span className="text-xs text-slate-400 uppercase">.{item.fileType}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View button */}
                    <button
                      onClick={() => handleView(item.id)}
                      disabled={viewLoading}
                      className="text-slate-400 hover:text-slate-700 transition-colors"
                      title="View"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>

                    {/* Delete button — user-owned only */}
                    {!item.isBuiltIn && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* View Modal */}
      {viewingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setViewingItem(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900 text-lg">{viewingItem.name}</span>
                <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  .{viewingItem.fileType}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(viewingItem)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={() => setViewingItem(null)}
                  className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              <pre className="text-sm text-slate-700 font-mono whitespace-pre-wrap break-words leading-relaxed">
                {viewingItem.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
