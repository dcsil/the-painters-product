'use client'

import { useState, useEffect } from 'react'
import SessionSidebar from './components/SessionSidebar'
import SessionDetailPanel from './components/SessionDetailPanel'

export default function MonitorPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [biasThreshold, setBiasThreshold] = useState(70)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && typeof data.biasThreshold === 'number') {
          setBiasThreshold(data.biasThreshold)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="h-[calc(100vh-57px)] flex overflow-hidden bg-slate-50">

      {/* ── LEFT SIDEBAR: Session list (~280px) ── */}
      <div className="w-[280px] shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="border-b border-slate-200 px-4 py-3 shrink-0">
          <h1 className="font-semibold text-slate-900 text-sm">Live Monitor</h1>
          <p className="text-xs text-slate-400 mt-0.5">Sessions from the last 30 minutes</p>
        </div>
        <SessionSidebar
          selectedId={selectedSessionId}
          onSelect={setSelectedSessionId}
        />
      </div>

      {/* ── MAIN PANEL: Session detail ── */}
      <div className="flex-1 overflow-hidden">
        {selectedSessionId ? (
          <SessionDetailPanel
            key={selectedSessionId}
            sessionId={selectedSessionId}
            biasThreshold={biasThreshold}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-center px-6">
            <div>
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium text-sm">Select a session to monitor</p>
              <p className="text-xs text-slate-400 mt-1">Sessions from the last 30 minutes appear in the sidebar</p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
