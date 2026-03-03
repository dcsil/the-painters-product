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

  return (
    <div className="flex gap-2 mt-4">
      {analyses.map(a => (
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
