'use client'

import { useState, useEffect, useMemo } from 'react'
import MonitoringPanel from '@/app/chat/components/MonitoringPanel'
import type { LiveMonitorResult } from '@/lib/live-monitor'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  monitoringData?: string
}

type MonitorEntry =
  | (LiveMonitorResult & { loading?: false })
  | { loading: true }

interface Props {
  sessionId: string
  biasThreshold: number
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function StatusBadge({ endedAt, endedReason }: { endedAt: boolean; endedReason: string | null }) {
  if (!endedAt) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
        Active
      </span>
    )
  }
  if (endedReason === 'violation') {
    return (
      <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
        Violated
      </span>
    )
  }
  return (
    <span className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">
      Ended
    </span>
  )
}

export default function SessionDetailPanel({ sessionId, biasThreshold }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isEnded, setIsEnded] = useState(false)
  const [endedReason, setEndedReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Effect 1: Load session on mount / sessionId change
  useEffect(() => {
    setLoading(true)
    setMessages([])
    setIsEnded(false)
    setEndedReason(null)

    fetch(`/api/chat/${sessionId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setMessages(data.messages ?? [])
        setIsEnded(!!data.endedAt)
        setEndedReason(data.endedReason ?? null)
      })
      .catch(() => { /* session not found or error */ })
      .finally(() => setLoading(false))
  }, [sessionId])

  // Effect 2: Poll for new messages when session is active
  useEffect(() => {
    if (isEnded) return

    const interval = setInterval(async () => {
      const res = await fetch(`/api/chat/${sessionId}`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages ?? [])
      if (data.endedAt) {
        setIsEnded(true)
        setEndedReason(data.endedReason ?? null)
      }
    }, 5_000)

    return () => clearInterval(interval)
  }, [sessionId, isEnded])

  // Reconstruct monitoring results from persisted monitoringData
  const monitoringResults = useMemo<Record<string, MonitorEntry>>(() => {
    const results: Record<string, MonitorEntry> = {}
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.monitoringData) {
        try {
          results[msg.id] = JSON.parse(msg.monitoringData)
        } catch { /* ignore */ }
      }
    }
    return results
  }, [messages])

  // Derive violation type and reason for the MonitoringPanel
  const violationInfo = useMemo(() => {
    if (endedReason !== 'violation') return { type: undefined, reason: undefined }
    for (const msg of [...messages].reverse()) {
      if (msg.role === 'assistant' && msg.monitoringData) {
        try {
          const result: LiveMonitorResult = JSON.parse(msg.monitoringData)
          if (result.hallucination) {
            return { type: 'hallucination' as const, reason: result.hallucinationReason }
          }
          if (result.biasScore >= biasThreshold) {
            return { type: 'bias' as const, reason: result.biasReason }
          }
        } catch { /* ignore */ }
      }
    }
    return { type: undefined, reason: undefined }
  }, [messages, endedReason, biasThreshold])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  const isLiveAgentMsg = (msg: Message) =>
    msg.content === 'A live agent is being connected. Please hold on.'

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT: Chat transcript (60%) ── */}
      <div className="flex flex-col bg-slate-50" style={{ width: '60%' }}>

        {/* Session header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900 text-sm">
                Session <span className="font-mono text-slate-600">…{sessionId.slice(-12)}</span>
              </p>
              <StatusBadge endedAt={isEnded} endedReason={endedReason} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{messages.length} messages</p>
          </div>
          {!isEnded && (
            <span className="flex items-center gap-1.5 text-xs text-blue-600">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse inline-block" />
              Live — refreshes every 5s
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm">No messages yet</p>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5 ${
                    isLiveAgentMsg(msg) ? 'bg-amber-500' : 'bg-slate-900'
                  }`}>
                    {isLiveAgentMsg(msg) ? (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-br-sm'
                        : isLiveAgentMsg(msg)
                        ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-bl-sm shadow-sm font-medium'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className={`text-[10px] text-slate-400 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Read-only indicator */}
        <div className="bg-white border-t border-slate-200 px-4 py-2 shrink-0">
          <p className="text-center text-xs text-slate-400">Read-only analyst view</p>
        </div>
      </div>

      {/* ── RIGHT: MonitoringPanel (40%) ── */}
      <div className="border-l border-slate-200" style={{ width: '40%' }}>
        <MonitoringPanel
          messages={messages}
          results={monitoringResults}
          threshold={biasThreshold}
          isViolated={endedReason === 'violation'}
          violationType={violationInfo.type}
          violationReason={violationInfo.reason}
          isSending={false}
        />
      </div>

    </div>
  )
}
