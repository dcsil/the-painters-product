'use client'

const TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  hallucination: 'Hallucinations',
  bias: 'Bias',
  toxicity: 'Toxicity',
}

export default function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: string[]
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  return (
    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {TAB_LABELS[tab] ?? tab}
        </button>
      ))}
    </div>
  )
}
