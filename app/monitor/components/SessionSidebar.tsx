'use client'

import { useState, useEffect, useRef } from 'react'

interface SessionListItem {
  id: string
  createdAt: string
  lastActivityAt: string
  endedAt: string | null
  endedReason: string | null
  messageCount: number
  lastMessage: { content: string; role: string; createdAt: string } | null
}

interface Props {
  selectedId: string | null
  onSelect: (id: string) => void
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(isoString).toLocaleDateString()
}

function StatusBadge({ endedAt, endedReason }: { endedAt: string | null; endedReason: string | null }) {
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

export default function SessionSidebar({ selectedId, onSelect }: Props) {
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [noMoreHistory, setNoMoreHistory] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Fix the "since" anchor at mount time so sessions don't disappear on refresh
  const sinceRef = useRef(new Date(Date.now() - 30 * 60 * 1000).toISOString())

  const fetchSessions = async (append = false, cursorOverride?: string) => {
    // "Load more" fetches with no time boundary (all history); initial/refresh uses 30-min anchor
    const params = new URLSearchParams({ limit: '20' })
    if (!append) params.set('since', sinceRef.current)
    const activeCursor = cursorOverride ?? null
    if (activeCursor) params.set('cursor', activeCursor)

    const res = await fetch(`/api/monitor/sessions?${params}`)
    if (!res.ok) return

    const data = await res.json()
    setSessions(prev => {
      if (append) return [...prev, ...data.sessions]
      // On refresh, merge to preserve order (new sessions at top, existing in place)
      const existingIds = new Set(prev.map((s: SessionListItem) => s.id))
      const newSessions = data.sessions.filter((s: SessionListItem) => !existingIds.has(s.id))
      const updated = prev.map((s: SessionListItem) => {
        const fresh = data.sessions.find((d: SessionListItem) => d.id === s.id)
        return fresh ?? s
      })
      return [...newSessions, ...updated]
    })
  }

  useEffect(() => {
    fetchSessions().finally(() => setLoading(false))
    const interval = setInterval(() => fetchSessions(), 30_000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMoreHistory = async () => {
    setLoadingMore(true)
    const params = new URLSearchParams({ limit: '20' })
    // Cursor = oldest session currently shown; no `since` = unbounded history
    if (sessions.length > 0) params.set('cursor', sessions[sessions.length - 1].id)
    const res = await fetch(`/api/monitor/sessions?${params}`)
    if (res.ok) {
      const data = await res.json()
      if (data.sessions.length === 0) {
        setNoMoreHistory(true)
      } else {
        setSessions(prev => [...prev, ...data.sessions])
        if (!data.nextCursor) setNoMoreHistory(true)
      }
    }
    setLoadingMore(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs text-slate-500">No sessions in the last 30 minutes</p>
          <p className="text-xs text-slate-400 mt-1">Waiting for new chats…</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedId === session.id
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-slate-600 truncate mr-2">
                  …{session.id.slice(-8)}
                </span>
                <StatusBadge endedAt={session.endedAt} endedReason={session.endedReason} />
              </div>
              <p className="text-xs text-slate-500">{formatRelativeTime(session.createdAt)}</p>
              <p className="text-xs text-slate-400">{session.messageCount} messages</p>
              {session.lastMessage && (
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {session.lastMessage.content.slice(0, 50)}{session.lastMessage.content.length > 50 ? '…' : ''}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {!noMoreHistory && !loading && (
        <button
          onClick={loadMoreHistory}
          disabled={loadingMore}
          className="w-full mt-3 py-2 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors disabled:opacity-50"
        >
          {loadingMore ? 'Loading…' : 'Load older sessions from history'}
        </button>
      )}
    </div>
  )
}
