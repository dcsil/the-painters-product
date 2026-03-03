'use client'

interface Analysis {
  analysisType: string
  result: string
  detectedIssues: number
}

interface CategorySummary {
  category: string
  label: string
  rateKey: string
  analyses: Analysis[]
}

const CATEGORY_CONFIG: Record<string, { label: string; rateKey: string; color: string; icon: string }> = {
  hallucination: {
    label: 'Hallucinations',
    rateKey: 'hallucinationRate',
    color: 'border-l-red-500',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  },
  bias: {
    label: 'Bias',
    rateKey: 'biasRate',
    color: 'border-l-pink-500',
    icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
  },
  toxicity: {
    label: 'Toxicity',
    rateKey: 'toxicityRate',
    color: 'border-l-violet-500',
    icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  },
}

function parseResult(analysis: Analysis) {
  try { return JSON.parse(analysis.result) } catch { return null }
}

function getBestAnalysis(analyses: Analysis[]): Analysis | null {
  // Prefer -both, then -gemini, then -groq, then base
  const priorities = ['-both', '-gemini', '-groq']
  for (const suffix of priorities) {
    const match = analyses.find(a => a.analysisType.endsWith(suffix))
    if (match) return match
  }
  return analyses[0] ?? null
}

export default function OverviewTab({
  groupedAnalyses,
}: {
  groupedAnalyses: Record<string, Analysis[]>
}) {
  const CATEGORY_ORDER = ['hallucination', 'bias', 'toxicity']
  const categories = CATEGORY_ORDER.filter(cat => cat in groupedAnalyses)
  let totalIssues = 0

  const summaries: CategorySummary[] = categories.map(cat => {
    const analyses = groupedAnalyses[cat]
    const best = getBestAnalysis(analyses)
    if (best) totalIssues += best.detectedIssues
    return { category: cat, label: CATEGORY_CONFIG[cat]?.label ?? cat, rateKey: CATEGORY_CONFIG[cat]?.rateKey ?? 'rate', analyses }
  })

  return (
    <div className="space-y-8">
      {/* Overall Status */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Overall Assessment</h2>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-md shadow-sm font-semibold tracking-wide border ${
            totalIssues === 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${totalIssues === 0 ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${totalIssues === 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            {totalIssues === 0 ? 'ALL CLEAR' : `${totalIssues} TOTAL ISSUE${totalIssues !== 1 ? 'S' : ''}`}
          </div>
        </div>
        <p className="text-sm text-slate-600 font-medium">
          {categories.length} analysis {categories.length === 1 ? 'type' : 'types'} completed across this conversation.
        </p>
      </div>

      {/* Per-Category Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaries.map(({ category, analyses }) => {
          const config = CATEGORY_CONFIG[category]
          if (!config) return null

          const best = getBestAnalysis(analyses)
          const result = best ? parseResult(best) : null
          const rate = result ? Math.round((result[config.rateKey] ?? 0) * 100) : 0
          const flagged = result?.flaggedTurns?.length ?? 0
          const summary = result?.summary ?? 'No summary available.'

          return (
            <div key={category} className={`bg-white rounded-xl shadow-sm border border-slate-200/60 border-l-4 ${config.color} p-6`}>
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={config.icon} />
                </svg>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">{config.label}</h3>
              </div>

              <div className="flex items-baseline gap-3 mb-3">
                <span className={`text-3xl font-extrabold ${rate > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {rate}%
                </span>
                <span className="text-sm text-slate-500 font-medium">detection rate</span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${
                  flagged > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {flagged} flagged turn{flagged !== 1 ? 's' : ''}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{summary}</p>
            </div>
          )
        })}
      </div>

      {/* Executive Summaries */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-8">
        <h2 className="text-xs font-bold text-slate-900 mb-6 uppercase tracking-widest">Executive Summaries</h2>
        <div className="space-y-4">
          {summaries.map(({ category, analyses }) => {
            const config = CATEGORY_CONFIG[category]
            if (!config) return null
            const best = getBestAnalysis(analyses)
            const result = best ? parseResult(best) : null
            if (!result?.summary) return null

            return (
              <div key={category} className="border-l-2 border-slate-200 pl-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{config.label}</h3>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">{result.summary}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
