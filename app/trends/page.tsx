'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface DailyDataPoint {
  date: string
  uploadCount: number
  totalIssues: number
  hallucinationIssues: number
  biasIssues: number
  toxicityIssues: number
}

interface TrendsData {
  dailyData: DailyDataPoint[]
  subtypeBreakdown: {
    hallucination: Record<string, number>
    bias: Record<string, number>
    toxicity: Record<string, number>
  }
  totals: {
    uploads: number
    issues: number
    priorIssues: number
    hallucinationRate: number
    biasRate: number
    toxicityRate: number
  }
}

const DAY_OPTIONS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

function shortDate(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00')
  if (days <= 7) return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function subtypeToRows(breakdown: Record<string, number>) {
  return Object.entries(breakdown).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
}

function TrendIndicator({ current, prior }: { current: number; prior: number }) {
  if (prior === 0 && current === 0) return <span className="text-slate-400 text-sm">No change</span>
  if (prior === 0) return <span className="text-red-500 text-sm font-medium">↑ New</span>
  const pct = Math.round(((current - prior) / prior) * 100)
  if (pct === 0) return <span className="text-slate-400 text-sm">No change</span>
  return (
    <span className={`text-sm font-medium ${pct > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
      {pct > 0 ? '↑' : '↓'} {Math.abs(pct)}% vs prior period
    </span>
  )
}

export default function TrendsPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/trends?days=${days}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

  const isEmpty = data && data.totals.uploads === 0

  const chartData = data?.dailyData.map(d => ({
    ...d,
    date: shortDate(d.date, days),
  }))

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Trends</h1>
            <p className="text-slate-500 text-sm mt-1">Issue patterns across all analyzed conversations</p>
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {DAY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  days === opt.value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-24 animate-pulse" />
              ))}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 h-72 animate-pulse" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 h-56 animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && isEmpty && (
          <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">No data yet</h2>
            <p className="text-slate-500 text-sm mb-6">Upload and analyze conversations to see trends here.</p>
            <a
              href="/upload"
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Upload a conversation
            </a>
          </div>
        )}

        {/* Charts */}
        {!loading && data && !isEmpty && (
          <div className="space-y-6">

            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Conversations</p>
                <p className="text-3xl font-bold text-slate-900">{data.totals.uploads}</p>
                <p className="text-xs text-slate-400 mt-1">analyzed this period</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Issues</p>
                <p className="text-3xl font-bold text-slate-900">{data.totals.issues}</p>
                <div className="mt-1">
                  <TrendIndicator current={data.totals.issues} prior={data.totals.priorIssues} />
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Detection Rates</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-red-500 font-medium">Hallucination</span>
                    <span className="text-slate-700 font-semibold">{data.totals.hallucinationRate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-500 font-medium">Bias</span>
                    <span className="text-slate-700 font-semibold">{data.totals.biasRate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-500 font-medium">Toxicity</span>
                    <span className="text-slate-700 font-semibold">{data.totals.toxicityRate}%</span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Most Flagged</p>
                {(() => {
                  const cats = [
                    { label: 'Hallucination', count: data.dailyData.reduce((s, d) => s + d.hallucinationIssues, 0), color: 'text-red-500' },
                    { label: 'Bias', count: data.dailyData.reduce((s, d) => s + d.biasIssues, 0), color: 'text-amber-500' },
                    { label: 'Toxicity', count: data.dailyData.reduce((s, d) => s + d.toxicityIssues, 0), color: 'text-purple-500' },
                  ].sort((a, b) => b.count - a.count)
                  const top = cats[0]
                  return top.count > 0 ? (
                    <>
                      <p className={`text-2xl font-bold ${top.color}`}>{top.label}</p>
                      <p className="text-xs text-slate-400 mt-1">{top.count} issues detected</p>
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm mt-1">No issues detected</p>
                  )
                })()}
              </div>
            </div>

            {/* Issues over time line chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Issues Over Time</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="hallucinationIssues" name="Hallucination" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="biasIssues" name="Bias" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="toxicityIssues" name="Toxicity" stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Subtype breakdown bar charts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Hallucination Subtypes', key: 'hallucination' as const, color: '#ef4444' },
                { label: 'Bias Subtypes', key: 'bias' as const, color: '#f59e0b' },
                { label: 'Toxicity Subtypes', key: 'toxicity' as const, color: '#a855f7' },
              ].map(({ label, key, color }) => (
                <div key={key} className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-sm font-semibold text-slate-700 mb-4">{label}</h2>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={subtypeToRows(data.subtypeBreakdown[key])}
                      layout="vertical"
                      margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={110} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="value" name="Issues" fill={color} radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </main>
  )
}
