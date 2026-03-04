'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed'

export default function ProcessingPage() {
  const router = useRouter()
  const params = useParams()
  const uploadId = params.id as string

  const [status, setStatus] = useState<UploadStatus>('pending')
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!uploadId) return

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 500)

    // Poll for status updates
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/upload/${uploadId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch status')
        }

        const data = await response.json()
        setStatus(data.status)
        setFileName(data.fileName)

        if (data.status === 'completed') {
          setProgress(100)
          clearInterval(pollInterval)
          clearInterval(progressInterval)
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push(`/dashboard/${uploadId}`)
          }, 1500)
        } else if (data.status === 'failed') {
          clearInterval(pollInterval)
          clearInterval(progressInterval)
          setError(data.errorMessage || 'Processing failed')
        }
      } catch (err) {
        console.error('Polling error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
        clearInterval(pollInterval)
        clearInterval(progressInterval)
      }
    }, 2000) // Poll every 2 seconds

    // Cleanup
    return () => {
      clearInterval(pollInterval)
      clearInterval(progressInterval)
    }
  }, [uploadId, router])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 text-center mb-2">
            Processing Failed
          </h2>
          <p className="text-slate-600 text-center mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push('/upload')}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-md shadow-sm border border-slate-200 p-8 max-w-md w-full">
        {/* Loading Animation */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-slate-200 rounded-full"></div>
            <div className="w-24 h-24 border-4 border-slate-900 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Status Text */}
        <h2 className="text-xl font-semibold text-slate-900 text-center mb-2">
          {status === 'completed' ? 'Analysis Complete!' : 'Processing Your Data...'}
        </h2>
        <p className="text-slate-600 text-center mb-6">
          {status === 'completed' 
            ? 'Redirecting to dashboard...'
            : 'Analyzing conversation data for insights and potential issues'}
        </p>

        {fileName && (
          <div className="mb-6 p-3 bg-slate-50 border border-slate-100 rounded-md">
            <p className="text-sm text-slate-700 text-center">
              <span className="font-semibold">File:</span> {fileName}
            </p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-medium text-slate-700">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div 
              className="bg-slate-900 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Processing Steps */}
        <div className="space-y-3">
          <div className={`flex items-center gap-3 ${status !== 'pending' ? 'text-green-600' : 'text-slate-500'}`}>
            {status !== 'pending' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <div className="w-5 h-5 border-2 border-slate-300 rounded-full"></div>
            )}
            <span className="text-sm font-medium">Validating conversation data</span>
          </div>

          <div className={`flex items-center gap-3 ${status === 'processing' || status === 'completed' ? 'text-green-600' : 'text-slate-500'}`}>
            {status === 'processing' || status === 'completed' ? (
              status === 'completed' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              )
            ) : (
              <div className="w-5 h-5 border-2 border-slate-300 rounded-full"></div>
            )}
            <span className="text-sm font-medium">Running AI analysis (hallucination, bias, toxicity)</span>
          </div>

          <div className={`flex items-center gap-3 ${status === 'completed' ? 'text-green-600' : 'text-slate-500'}`}>
            {status === 'completed' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <div className="w-5 h-5 border-2 border-slate-300 rounded-full"></div>
            )}
            <span className="text-sm font-medium">Generating insights</span>
          </div>
        </div>

        {/* Info Message */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 text-center">
            This may take a few moments. Please don't close this page.
          </p>
        </div>
      </div>
    </div>
  )
}
