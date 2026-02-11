'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

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

export default function DashboardPage() {
  const params = useParams()
  const uploadId = params.id as string

  const [upload, setUpload] = useState<Upload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)

  useEffect(() => {
    if (!uploadId) return

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/upload/${uploadId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch analysis data')
        }

        const data = await response.json()
        setUpload(data)
        if (data.analyses.length > 0) {
          setSelectedAnalysis(data.analyses[0])
        }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !upload) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Upload not found'}</p>
          <Link
            href="/"
            className="inline-block py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const totalIssues = upload.analyses.reduce((sum, analysis) => sum + analysis.detectedIssues, 0)
  const avgConfidence = upload.analyses.length > 0
    ? (upload.analyses.reduce((sum, analysis) => sum + analysis.confidence, 0) / upload.analyses.length * 100).toFixed(1)
    : 0

  const getAnalysisIcon = (type: string) => {
    switch (type) {
      case 'hallucination':
        return '🔍'
      case 'gender_bias':
        return '⚖️'
      case 'toxicity':
        return '⚠️'
      default:
        return '📊'
    }
  }

  const getAnalysisColor = (type: string) => {
    switch (type) {
      case 'hallucination':
        return 'from-purple-500 to-pink-500'
      case 'gender_bias':
        return 'from-blue-500 to-cyan-500'
      case 'toxicity':
        return 'from-red-500 to-orange-500'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Analysis Dashboard
              </h1>
              <p className="text-gray-600">
                {upload.fileName} • {new Date(upload.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
              ✓ Completed
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 text-sm font-medium">Total Issues Detected</h3>
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-4xl font-bold text-gray-900">{totalIssues}</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 text-sm font-medium">Average Confidence</h3>
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-4xl font-bold text-gray-900">{avgConfidence}%</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 text-sm font-medium">Analysis Types</h3>
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-4xl font-bold text-gray-900">{upload.analyses.length}</p>
          </div>
        </div>

        {/* Analysis Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {upload.analyses.map((analysis) => {
            const resultData = JSON.parse(analysis.result)
            return (
              <button
                key={analysis.id}
                onClick={() => setSelectedAnalysis(analysis)}
                className={`bg-white rounded-lg shadow-lg p-6 text-left transition-all hover:scale-105 ${
                  selectedAnalysis?.id === analysis.id ? 'ring-4 ring-blue-500' : ''
                }`}
              >
                <div className={`w-12 h-12 bg-gradient-to-r ${getAnalysisColor(analysis.analysisType)} rounded-lg flex items-center justify-center text-2xl mb-4`}>
                  {getAnalysisIcon(analysis.analysisType)}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 capitalize">
                  {analysis.analysisType.replace('_', ' ')}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Issues Found</span>
                    <span className="font-semibold text-gray-900">{analysis.detectedIssues}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Confidence</span>
                    <span className="font-semibold text-gray-900">{(analysis.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Detailed Analysis View */}
        {selectedAnalysis && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 bg-gradient-to-r ${getAnalysisColor(selectedAnalysis.analysisType)} rounded-lg flex items-center justify-center text-3xl`}>
                {getAnalysisIcon(selectedAnalysis.analysisType)}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 capitalize">
                  {selectedAnalysis.analysisType.replace('_', ' ')} Analysis
                </h2>
                <p className="text-gray-600">
                  Detailed insights and recommendations
                </p>
              </div>
            </div>

            {(() => {
              const resultData = JSON.parse(selectedAnalysis.result)
              return (
                <div className="space-y-6">
                  {/* Summary */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Summary</h3>
                    <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">
                      {resultData.summary}
                    </p>
                  </div>

                  {/* Details */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Details</h3>
                    <p className="text-gray-700">
                      {resultData.details}
                    </p>
                  </div>

                  {/* Recommendations */}
                  {resultData.recommendations && resultData.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Recommendations</h3>
                      <ul className="space-y-2">
                        {resultData.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-gray-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Confidence Score</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${selectedAnalysis.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="font-semibold text-gray-900">
                          {(selectedAnalysis.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Issues Detected</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedAnalysis.detectedIssues}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <Link
            href="/upload"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Analyze Another File
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-lg shadow-md transition-colors border border-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Export Report
          </button>
        </div>
      </div>
    </div>
  )
}
