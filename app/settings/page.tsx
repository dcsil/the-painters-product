'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const ANALYSIS_MODES = [
  { value: 'gemini', label: 'Gemini (Balanced)', description: 'Uses Google Gemini for reliable, balanced analysis' },
  { value: 'groq', label: 'Groq / Llama (Faster)', description: 'Uses Groq with Llama for faster analysis' },
  { value: 'both', label: 'Both (Deeper Analysis)', description: 'Gemini analyzes first, then Groq cross-checks for a deeper result' },
]

const ANALYSIS_TYPES = [
  { value: 'hallucination', label: 'Hallucination Detection' },
  { value: 'bias', label: 'Bias Detection' },
  { value: 'toxicity', label: 'Toxicity Detection' },
]

export default function SettingsPage() {
  const [mode, setMode] = useState('gemini')
  const [analyses, setAnalyses] = useState<string[]>(['hallucination', 'bias', 'toxicity'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setMode(data.defaultAnalysisMode)
        setAnalyses(data.defaultAnalyses.split(','))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (analyses.length === 0) {
      setError('Select at least one analysis type')
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultAnalysisMode: mode,
          defaultAnalyses: analyses.join(','),
        }),
      })

      if (!res.ok) throw new Error('Failed to save settings')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleAnalysis = (value: string) => {
    setAnalyses(prev =>
      prev.includes(value)
        ? prev.filter(a => a !== value)
        : [...prev, value]
    )
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600">Configure your default analysis preferences. These can be overridden per upload.</p>
        </div>

        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-8 space-y-8">
          {/* Analysis Mode */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Analysis Mode</h2>
            <p className="text-sm text-slate-500 mb-4">Choose which AI model(s) to use for analysis.</p>
            <div className="space-y-3">
              {ANALYSIS_MODES.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-4 rounded-md border cursor-pointer transition-colors ${
                    mode === opt.value
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={opt.value}
                    checked={mode === opt.value}
                    onChange={() => setMode(opt.value)}
                    className="mt-0.5 accent-slate-900"
                  />
                  <div>
                    <div className="font-medium text-slate-900">{opt.label}</div>
                    <div className="text-sm text-slate-500">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Analysis Types */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Default Analysis Types</h2>
            <p className="text-sm text-slate-500 mb-4">Select which analyses to run by default on each upload.</p>
            <div className="space-y-3">
              {ANALYSIS_TYPES.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-4 rounded-md border cursor-pointer transition-colors ${
                    analyses.includes(opt.value)
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={analyses.includes(opt.value)}
                    onChange={() => toggleAnalysis(opt.value)}
                    className="accent-slate-900"
                  />
                  <span className="font-medium text-slate-900">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 font-medium text-sm">{error}</p>
            </div>
          )}

          {saved && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 font-medium text-sm">Settings saved successfully.</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-md shadow-sm transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
