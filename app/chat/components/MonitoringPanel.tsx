'use client'

import { useRef, useEffect } from 'react'
import type { LiveMonitorResult } from '@/lib/live-monitor'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

type MonitorEntry =
  | (LiveMonitorResult & { loading?: false; error?: string })
  | { loading: true }

interface Props {
  messages: Message[]
  results: Record<string, MonitorEntry>
  threshold: number           // 0–100
  isViolated: boolean
  violationType?: 'hallucination' | 'bias'
  violationReason?: string    // LLM explanation for why the session was stopped
  isSending: boolean          // true while waiting for current bot reply
}

function BiasBar({ score, threshold }: { score: number; threshold: number }) {
  const pct = Math.min(100, Math.max(0, score))

  const barColor =
    pct >= threshold
      ? 'bg-red-500'
      : pct >= 50
      ? 'bg-amber-400'
      : 'bg-emerald-500'

  const textColor =
    pct >= threshold
      ? 'text-red-600'
      : pct >= 50
      ? 'text-amber-600'
      : 'text-emerald-600'

  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500">Bias</span>
        <span className={`text-xs font-semibold ${textColor}`}>{pct}%</span>
      </div>
      <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
        {/* Threshold marker */}
        <div
          className="absolute top-0 h-full w-px bg-slate-400 opacity-60"
          style={{ left: `${threshold}%` }}
        />
      </div>
    </div>
  )
}

export default function MonitoringPanel({
  messages,
  results,
  threshold,
  isViolated,
  violationType,
  violationReason,
  isSending,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new results arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [Object.keys(results).length, isSending])

  // Only care about assistant messages (excluding the optimistic "live agent" bubble)
  const assistantMessages = messages.filter(
    m => m.role === 'assistant' && !m.id.startsWith('live-agent-')
  )

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-slate-900">Live Monitor</h2>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            Bias threshold: {threshold}%
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">Hallucination + bias check per assistant message</p>
      </div>

      {/* Violation banner */}
      {isViolated && (
        <div className="mx-3 mt-3 shrink-0 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2.5">
          <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-red-700">Session stopped — live agent connecting</p>
            <p className="text-xs text-red-500 mt-0.5">
              {violationType === 'hallucination'
                ? 'A hallucination was detected in the last response.'
                : `Bias score exceeded the ${threshold}% threshold.`}
            </p>
            {violationReason && (
              <p className="text-xs text-red-400 mt-1 italic leading-relaxed">
                Reason: {violationReason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rows */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {assistantMessages.length === 0 && !isSending ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500">Awaiting first response…</p>
            <p className="text-xs text-slate-400 mt-1">Results will appear here after each bot reply.</p>
          </div>
        ) : (
          <>
            {assistantMessages.map((msg, idx) => {
              const entry = results[msg.id]
              const preview = msg.content.length > 65
                ? msg.content.slice(0, 65).trimEnd() + '…'
                : msg.content

              return (
                <div
                  key={msg.id}
                  className={`bg-white rounded-lg border p-3 ${
                    entry && !('loading' in entry) && entry.error
                      ? 'border-slate-200'
                      : entry && !('loading' in entry) && (entry.hallucination || entry.biasScore >= threshold)
                      ? 'border-red-200 bg-red-50/40'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Row header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400">Message {idx + 1}</span>
                    {entry && !('loading' in entry) && (entry.hallucination || entry.biasScore >= threshold) && (
                      <span className="text-xs font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                        ⚠ FLAGGED
                      </span>
                    )}
                  </div>

                  {/* Message preview */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-2.5 italic">&ldquo;{preview}&rdquo;</p>

                  {/* Loading skeleton */}
                  {!entry && (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-3 bg-slate-100 rounded w-3/4" />
                      <div className="h-1.5 bg-slate-100 rounded-full" />
                    </div>
                  )}

                  {/* Error state */}
                  {entry && !('loading' in entry) && entry.error && (
                    <p className="text-xs text-slate-400 italic">Monitoring unavailable for this message.</p>
                  )}

                  {/* Results */}
                  {entry && !('loading' in entry) && !entry.error && (
                    <>
                      {/* Hallucination chip */}
                      <div className="flex items-center gap-1.5 mb-2">
                        {entry.hallucination ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full"
                            title={entry.hallucinationReason || 'Hallucination detected'}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Hallucination
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            No hallucination
                          </span>
                        )}
                      </div>

                      {/* Bias bar */}
                      <BiasBar score={entry.biasScore} threshold={threshold} />
                      {entry.biasReason && entry.biasScore > 0 && (
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed" title={entry.biasReason}>
                          {entry.biasReason.length > 80 ? entry.biasReason.slice(0, 80) + '…' : entry.biasReason}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )
            })}

            {/* Pending/loading row while bot is typing */}
            {isSending && (
              <div className="bg-white rounded-lg border border-slate-200 p-3 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Message {assistantMessages.length + 1}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-4/5" />
                  <div className="h-1.5 bg-slate-100 rounded-full mt-3" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer legend */}
      <div className="border-t border-slate-200 bg-white px-4 py-2 shrink-0">
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Clean
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Caution
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Flagged (≥{threshold}%)
          </span>
        </div>
      </div>
    </div>
  )
}
