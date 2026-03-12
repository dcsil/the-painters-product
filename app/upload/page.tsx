'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface GroundTruthOption {
  id: string
  name: string
  isBuiltIn: boolean
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

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setError(null)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) validateAndSetFile(droppedFile)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const selectedFile = e.target.files?.[0]
    if (selectedFile) validateAndSetFile(selectedFile)
  }

  const validateAndSetFile = (file: File) => {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('Please upload a valid JSON file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }
    setFile(file)
  }

  const toggleAnalysis = (value: string) => {
    setSelectedAnalyses(prev =>
      prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]
    )
  }

  const handleUpload = async () => {
    if (!file) return
    if (selectedAnalyses.length === 0) {
      setError('Select at least one analysis type')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const fileContent = await file.text()
      let jsonData

      try {
        const cleanContent = fileContent.replace(/^\uFEFF/, '').trim()
        jsonData = JSON.parse(cleanContent)
      } catch {
        setError('Invalid JSON format. Please check your file.')
        setIsUploading(false)
        return
      }

      if (!Array.isArray(jsonData)) {
        setError('JSON must contain an array of chat messages')
        setIsUploading(false)
        return
      }

      const hasValidStructure = jsonData.every((msg: Record<string, unknown>) =>
        msg && typeof msg === 'object' && 'id' in msg && 'content' in msg
      )

      if (!hasValidStructure) {
        setError('Each message must have "id" and "content" fields')
        setIsUploading(false)
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', file.name)
      formData.append('fileSize', file.size.toString())
      formData.append('analysisMode', analysisMode)
      formData.append('selectedAnalyses', selectedAnalyses.join(','))
      if (groundTruthId) {
        formData.append('groundTruthId', groundTruthId)
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      router.push(`/processing/${data.uploadId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during upload')
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-3xl mx-auto py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Upload Conversation Data
          </h1>
          <p className="text-slate-600">
            Upload a JSON file containing AI chatbot conversation data for analysis.
          </p>
        </div>

        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-8">
          {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-md p-12 text-center transition-colors ${
              isDragging ? 'border-slate-500 bg-slate-50' : 'border-slate-300'
            }`}
          >
            {!file ? (
              <>
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer text-slate-900 hover:text-slate-700 font-medium underline underline-offset-2">
                    Click to upload
                  </label>
                  <span className="text-slate-600"> or drag and drop</span>
                  <input id="file-upload" type="file" className="hidden" accept=".json,application/json" onChange={handleFileSelect} disabled={isUploading} />
                </div>
                <p className="mt-2 text-sm text-slate-500">JSON file up to 10MB</p>
              </>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                {!isUploading && (
                  <button onClick={() => setFile(null)} className="ml-4 text-red-600 hover:text-red-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Analysis Configuration */}
          <div className="mt-6 space-y-6">
            {/* Analysis Mode */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Analysis Mode</label>
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

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 font-medium text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Expected Format */}
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

          {/* Upload Button */}
          <div className="mt-6">
            <button
              onClick={handleUpload}
              disabled={!file || isUploading || selectedAnalyses.length === 0}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Start Analysis
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
