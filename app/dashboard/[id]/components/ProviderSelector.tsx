'use client'

interface Analysis {
  analysisType: string
}

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  groq: 'Groq (Llama)',
  both: 'Cross-Check',
}

function getProviderLabel(analysisType: string): string {
  const suffix = analysisType.split('-').slice(1).join('-')
  return PROVIDER_LABELS[suffix] ?? suffix
}

export default function ProviderSelector({
  analyses,
  selected,
  onSelect,
}: {
  analyses: Analysis[]
  selected: string
  onSelect: (type: string) => void
}) {
  if (analyses.length <= 1) return null

  const SUFFIX_ORDER = ['gemini', 'groq', 'both']
  const sorted = [...analyses].sort((a, b) => {
    const sa = a.analysisType.split('-').slice(1).join('-')
    const sb = b.analysisType.split('-').slice(1).join('-')
    const ia = SUFFIX_ORDER.indexOf(sa)
    const ib = SUFFIX_ORDER.indexOf(sb)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  return (
    <div className="flex gap-2 mt-4">
      {sorted.map(a => (
        <button
          key={a.analysisType}
          onClick={() => onSelect(a.analysisType)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selected === a.analysisType
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {getProviderLabel(a.analysisType)}
        </button>
      ))}
    </div>
  )
}
