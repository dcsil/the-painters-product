'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface GroundTruthOption {
  id: string
  name: string
  isBuiltIn: boolean
}

interface FileEntry {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  uploadId?: string
  error?: string
}

const ANALYSIS_MODES = [
  { value: 'gemini', label: 'Gemini (Balanced)' },
  { value: 'groq', label: 'Groq / Llama (Faster)' },
  { value: 'both', label: 'Both (Deeper Analysis)' },
]

const ANALYSIS_TYPES = [
  { value: 'hallucination', label: 'Hallucination Detection' },
  { value: 'bias', label: 'Bias Detection' },
  { value: 'toxicity', label: 'Toxicity Detection' },
]

const MAX_FILES = 10

function validateFile(file: File): string | null {
  if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
    return `${file.name}: must be a .json file`
  }
  if (file.size > 10 * 1024 * 1024) {
    return `${file.name}: must be less than 10MB`
  }
  return null
}

async function validateJsonContent(file: File): Promise<string | null> {
  try {
    const text = await file.text()
    const cleanText = text.replace(/^\uFEFF/, '').trim()
    const data = JSON.parse(cleanText)
    if (!Array.isArray(data)) {
      return `${file.name}: JSON must be an array of messages`
    }
    const valid = data.every(
      (msg: Record<string, unknown>) =>
        msg && typeof msg === 'object' && 'id' in msg && 'content' in msg
    )
    if (!valid) {
      return `${file.name}: each message must have "id" and "content" fields`
    }
    return null
  } catch {
    return `${file.name}: invalid JSON format`
  }
}

export default function UploadPage() {
  const router = useRouter()

  // File state — supports single or multiple
  const [files, setFiles] = useState<FileEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batchDone, setBatchDone] = useState(false)
  const [batchId, setBatchId] = useState<string | null>(null)

  // Analysis options
  const [analysisMode, setAnalysisMode] = useState('gemini')
  const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>(['hallucination', 'bias', 'toxicity'])
  const [groundTruthId, setGroundTruthId] = useState('')
  const [groundTruths, setGroundTruths] = useState<GroundTruthOption[]>([])

  // Load defaults from settings and available ground truths
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.defaultAnalysisMode) setAnalysisMode(data.defaultAnalysisMode)
        if (data.defaultAnalyses) setSelectedAnalyses(data.defaultAnalyses.split(','))
      })
      .catch(() => {})

    fetch('/api/ground-truth')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGroundTruths(data)
      })
      .catch(() => {})
  }, [])

  const addFiles = useCallback(async (incoming: FileList | File[]) => {
    setError(null)
    const arr = Array.from(incoming)

    const remaining = MAX_FILES - files.length
    if (remaining <= 0) {
      setError(`Maximum ${MAX_FILES} files allowed per batch`)
      return
    }

    const toAdd = arr.slice(0, remaining)
    if (arr.length > remaining) {
      setError(`Only ${remaining} more file(s) can be added (max ${MAX_FILES})`)
    }

    const errors: string[] = []
    const valid: FileEntry[] = []

    for (const f of toAdd) {
      const fileErr = validateFile(f)
      if (fileErr) {
        errors.push(fileErr)
        continue
      }
      const contentErr = await validateJsonContent(f)
      if (contentErr) {
        errors.push(contentErr)
        continue
      }
      valid.push({ file: f, status: 'pending' })
    }

    if (errors.length > 0) {
      setError(errors.join('\n'))
    }

    if (valid.length > 0) {
      setFiles(prev => [...prev, ...valid])
    }
  }, [files.length])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setError(null)
  }

  const toggleAnalysis = (value: string) => {
    setSelectedAnalyses(prev =>
      prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]
    )
  }

  const uploadSingleFile = async (
    entry: FileEntry,
    bId: string | null,
    onProgress: (uploadId?: string, error?: string) => void
  ) => {
    const formData = new FormData()
    formData.append('file', entry.file)
    formData.append('fileName', entry.file.name)
    formData.append('fileSize', entry.file.size.toString())
    formData.append('analysisMode', analysisMode)
    formData.append('selectedAnalyses', selectedAnalyses.join(','))
    if (groundTruthId) formData.append('groundTruthId', groundTruthId)
    if (bId) formData.append('batchId', bId)

    const response = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!response.ok) {
      const errData = await response.json()
      if (response.status === 429) {
        const seconds = errData.retryAfter ?? 60
        throw new Error(
          `Rate limit reached — you can upload again in ${seconds} second${seconds !== 1 ? 's' : ''}.`
        )
      }
      throw new Error(errData.error || 'Upload failed')
    }
    const data = await response.json()
    onProgress(data.uploadId)
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    if (selectedAnalyses.length === 0) {
      setError('Select at least one analysis type')
      return
    }

    setIsUploading(true)
    setError(null)
    setBatchDone(false)

    const isBatch = files.length > 1
    const newBatchId = isBatch ? crypto.randomUUID() : null
    setBatchId(newBatchId)

    // Single file — use existing processing page flow
    if (!isBatch) {
      try {
        await uploadSingleFile(files[0], null, (uploadId) => {
          router.push(`/processing/${uploadId}`)
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
        setIsUploading(false)
      }
      return
    }

    // Multi-file batch — sequential uploads with inline progress
    const updatedFiles = files.map(f => ({ ...f, status: 'pending' as const }))
    setFiles(updatedFiles)

    for (let i = 0; i < updatedFiles.length; i++) {
      // Mark as uploading
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f))

      try {
        let doneUploadId: string | undefined
        await uploadSingleFile(updatedFiles[i], newBatchId, (uploadId) => {
          doneUploadId = uploadId
        })
        setFiles(prev =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'done', uploadId: doneUploadId } : f
          )
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        setFiles(prev =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error', error: msg } : f
          )
        )
      }
    }

    setIsUploading(false)
    setBatchDone(true)
  }

  const hasFiles = files.length > 0
  const isBatchMode = files.length > 1
  const allDone = batchDone && files.every(f => f.status === 'done' || f.status === 'error')
  const successCount = files.filter(f => f.status === 'done').length

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-3xl mx-auto py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Upload Conversation Data
          </h1>
          <p className="text-slate-600">
            Upload one or more JSON files containing AI chatbot conversation data for analysis.
            {' '}Up to {MAX_FILES} files per batch.
          </p>
        </div>

        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-8">
          {/* Drop Zone */}
          {!isUploading && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-md p-10 text-center transition-colors ${
                isDragging ? 'border-slate-500 bg-slate-50' : 'border-slate-300'
              }`}
            >
              <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <label htmlFor="file-upload" className="cursor-pointer text-slate-900 hover:text-slate-700 font-medium underline underline-offset-2">
                  Click to select files
                </label>
                <span className="text-slate-600"> or drag and drop</span>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".json,application/json"
                  multiple
                  onChange={handleFileSelect}
                />
              </div>
              <p className="mt-1 text-sm text-slate-500">JSON files up to 10MB each · max {MAX_FILES} files</p>
            </div>
          )}

          {/* File List */}
          {hasFiles && (
            <div className="mt-4 space-y-2">
              {files.map((entry, i) => (
                <div
                  key={`${entry.file.name}-${i}`}
                  className={`flex items-center justify-between px-4 py-3 rounded-md border text-sm ${
                    entry.status === 'done'
                      ? 'border-green-200 bg-green-50'
                      : entry.status === 'error'
                      ? 'border-red-200 bg-red-50'
                      : entry.status === 'uploading'
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status icon */}
                    {entry.status === 'done' && (
                      <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {entry.status === 'error' && (
                      <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {entry.status === 'uploading' && (
                      <svg className="animate-spin w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {entry.status === 'pending' && (
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{entry.file.name}</p>
                      {entry.status === 'error' && entry.error && (
                        <p className="text-red-600 text-xs mt-0.5">{entry.error}</p>
                      )}
                      {entry.status === 'uploading' && (
                        <p className="text-blue-600 text-xs mt-0.5">Analyzing…</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-500 text-xs">{(entry.file.size / 1024).toFixed(1)} KB</span>
                    {!isUploading && entry.status === 'pending' && (
                      <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Analysis Configuration — hidden during batch progress */}
          {!isUploading && !allDone && (
            <div className="mt-6 space-y-6">
              {/* Analysis Mode */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Analysis Mode
                  {isBatchMode && <span className="font-normal text-slate-500"> · applied to all files</span>}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ANALYSIS_MODES.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAnalysisMode(opt.value)}
                      className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                        analysisMode === opt.value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Analysis Types */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Analysis Types</label>
                <div className="flex gap-3 flex-wrap">
                  {ANALYSIS_TYPES.map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors text-sm ${
                        selectedAnalyses.includes(opt.value)
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAnalyses.includes(opt.value)}
                        onChange={() => toggleAnalysis(opt.value)}
                        className="accent-slate-900"
                      />
                      <span className="text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ground Truth */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Ground Truth <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <select
                  value={groundTruthId}
                  onChange={e => setGroundTruthId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                >
                  <option value="">None — no ground truth</option>
                  {groundTruths.map(gt => (
                    <option key={gt.id} value={gt.id}>
                      {gt.name}{gt.isBuiltIn ? ' (Built-in)' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Select a ground truth document to ground the analysis in verified facts.{' '}
                  <Link href="/ground-truth" className="underline hover:text-slate-700">Manage ground truths</Link>
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 font-medium text-sm whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}

          {/* Expected Format — only when no files yet */}
          {!hasFiles && (
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-md">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Expected JSON Format:</h3>
              <pre className="text-sm text-slate-700 overflow-x-auto font-mono bg-white p-3 border border-slate-100 rounded">
{`[
  {
    "id": "user",
    "content": "Hello, how are you?"
  },
  {
    "id": "assistant",
    "content": "I'm doing well, thank you!"
  }
]`}
              </pre>
            </div>
          )}

          {/* Batch complete — results CTA */}
          {allDone && batchId && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium text-sm mb-3">
                {successCount} of {files.length} file{files.length !== 1 ? 's' : ''} analyzed successfully.
              </p>
              <Link
                href={`/batch/${batchId}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View Batch Results
              </Link>
            </div>
          )}

          {/* Upload Button */}
          {!allDone && (
            <div className="mt-6">
              <button
                onClick={handleUpload}
                disabled={!hasFiles || isUploading || selectedAnalyses.length === 0}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isBatchMode
                      ? `Analyzing ${files.filter(f => f.status !== 'pending').length + 1} of ${files.length}…`
                      : 'Analyzing…'}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {isBatchMode
                      ? `Analyze ${files.length} Files`
                      : 'Start Analysis'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
