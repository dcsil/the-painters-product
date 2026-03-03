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

export default function GroundTruthPage() {
  const [items, setItems] = useState<GroundTruthItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          <Link
            href="/"
            className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-4 font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
