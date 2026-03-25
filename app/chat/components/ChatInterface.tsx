'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MonitoringPanel from './MonitoringPanel'
import type { LiveMonitorResult } from '@/lib/live-monitor'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  monitoringData?: string
}

type MonitorEntry =
  | (LiveMonitorResult & { loading?: false })
  | { loading: true }

interface ChatInterfaceProps {
  initialSessionId?: string
  initialMessages?: Message[]
  initialEnded?: boolean
}

export default function ChatInterface({
  initialSessionId,
  initialMessages,
  initialEnded = false,
}: ChatInterfaceProps) {
  const router = useRouter()

  // --- Chat state ---
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? [])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null)
  const [isSending, setIsSending] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [ended, setEnded] = useState(initialEnded)
  const [error, setError] = useState<string | null>(null)

  // --- Monitoring state ---
  const [monitoringResults, setMonitoringResults] = useState<Record<string, MonitorEntry>>({})
  const [biasThreshold, setBiasThreshold] = useState(70)
  const [isViolated, setIsViolated] = useState(false)
  const [violationType, setViolationType] = useState<'hallucination' | 'bias' | undefined>()
  const [violationReason, setViolationReason] = useState<string | undefined>()

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Hydrate monitoringResults from persisted monitoringData on initial messages
  useEffect(() => {
    if (!initialMessages) return
    const results: Record<string, MonitorEntry> = {}
    for (const msg of initialMessages) {
      if (msg.role === 'assistant' && msg.monitoringData) {
        try {
          results[msg.id] = JSON.parse(msg.monitoringData)
        } catch { /* ignore parse errors */ }
      }
    }
    setMonitoringResults(results)

    // Detect if session ended due to violation (check for live-agent message)
    const hasLiveAgent = initialMessages.some(m =>
      m.role === 'assistant' && m.content === 'A live agent is being connected. Please hold on.'
    )
    if (hasLiveAgent) {
      setIsViolated(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll chat to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load bias threshold from analyst settings (if user is logged in)
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && typeof data.biasThreshold === 'number') {
          setBiasThreshold(data.biasThreshold)
        }
      })
      .catch(() => { /* silently use default 70 */ })
  }, [])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isSending || ended || isViolated) return

    setInput('')
    setError(null)
    setIsSending(true)

    // Optimistic user message
    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])

    // Track whether this is the first message (no session yet)
    const isFirstMessage = !sessionId

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 429) {
          const seconds = data.retryAfter ?? 60
          throw new Error(
            `Rate limit reached — try again in ${seconds} second${seconds !== 1 ? 's' : ''}.`
          )
        }
        throw new Error(data.error ?? 'Failed to send message')
      }

      const data = await res.json()
      const currentSessionId = data.sessionId
      setSessionId(currentSessionId)
      setMessages(data.messages)

      // Push URL to /chat/[id] on first message so the session has a shareable URL
      if (isFirstMessage) {
        router.replace(`/chat/${currentSessionId}`, { scroll: false })
      }

      // --- Process monitoring result ---
      const result: LiveMonitorResult | null = data.monitoringResult
      const newAssistantMsg = [...(data.messages as Message[])]
        .reverse()
        .find(m => m.role === 'assistant')

      if (newAssistantMsg) {
        if (result) {
          setMonitoringResults(prev => ({ ...prev, [newAssistantMsg.id]: result }))
        } else {
          // Monitoring failed — show error state in panel
          setMonitoringResults(prev => ({
            ...prev,
            [newAssistantMsg.id]: { hallucination: false, biasScore: 0, hallucinationReason: '', biasReason: '', error: 'monitoring_failed' },
          }))
        }

        // --- Check for violation ---
        if (result && !result.error) {
          const biasViolation = result.biasScore >= biasThreshold
          const hallucinationViolation = result.hallucination

          if (hallucinationViolation || biasViolation) {
            const type: 'hallucination' | 'bias' = hallucinationViolation ? 'hallucination' : 'bias'
            const reason = (hallucinationViolation ? result.hallucinationReason : result.biasReason) || undefined
            setIsViolated(true)
            setViolationType(type)
            setViolationReason(reason)

            // Optimistically add "live agent" message to chat UI immediately
            setMessages(prev => [
              ...prev,
              {
                id: `live-agent-${Date.now()}`,
                role: 'assistant',
                content: 'A live agent is being connected. Please hold on.',
                createdAt: new Date().toISOString(),
              },
            ])

            // Fire-and-forget: trigger full analysis + send violation email
            fetch(`/api/chat/${currentSessionId}/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                analysisMode: 'groq',
                selectedAnalyses: 'hallucination,bias,toxicity',
                violationDetails: {
                  type,
                  messageContent: newAssistantMsg.content,
                  biasScore: result.biasScore,
                  biasThreshold,
                  reason,
                },
              }),
            }).catch(err => console.error('[chat] Auto-complete on violation failed:', err))
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      // Roll back optimistic message
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      setInput(text)
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  const endChat = async () => {
    if (!sessionId || isEnding || ended || isViolated) return
    setIsEnding(true)
    setError(null)

    try {
      const res = await fetch(`/api/chat/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisMode: 'groq', selectedAnalyses: 'hallucination,bias,toxicity' }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to end session')
      }

      setEnded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not end the chat')
    } finally {
      setIsEnding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // --- Thank-you screen (normal end) ---
  if (ended) {
    return (
      <div className="min-h-[calc(100vh-57px)] bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Thanks for chatting with us!</h1>
          <button
            onClick={() => router.push('/')}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  // --- Main 60/40 split layout ---
  return (
    <div className="h-[calc(100vh-57px)] flex overflow-hidden">

      {/* ── LEFT PANEL: Chat (60%) ── */}
      <div className="flex flex-col bg-slate-50" style={{ width: '60%' }}>

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-tight">Support Assistant</p>
              {isViolated ? (
                <span className="flex items-center gap-1 text-xs text-red-600">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
                  Connecting live agent…
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                  Online
                </span>
              )}
            </div>
          </div>
          {messages.length > 0 && !isViolated && (
            <button
              onClick={endChat}
              disabled={isEnding}
              className="text-xs text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEnding ? 'Ending…' : 'End Chat'}
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm">Hi! How can I help you today?</p>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5 ${
                  msg.id.startsWith('live-agent-') || msg.content === 'A live agent is being connected. Please hold on.' ? 'bg-amber-500' : 'bg-slate-900'
                }`}>
                  {msg.id.startsWith('live-agent-') || msg.content === 'A live agent is being connected. Please hold on.' ? (
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
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white rounded-br-sm'
                    : msg.id.startsWith('live-agent-') || msg.content === 'A live agent is being connected. Please hold on.'
                    ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-bl-sm shadow-sm font-medium'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Bot typing indicator */}
          {isSending && (
            <div className="flex justify-start">
              <div className="w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="max-w-3xl mx-auto w-full px-4 pb-2 shrink-0">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-red-700">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
          {isViolated ? (
            <div className="max-w-3xl mx-auto text-center py-2">
              <p className="text-sm text-amber-700 font-medium">
                Chat paused — a live agent is being connected. Please wait.
              </p>
            </div>
          ) : (
            <>
              <div className="max-w-3xl mx-auto flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message…"
                  disabled={isSending || ended || isViolated}
                  rows={1}
                  className="flex-1 resize-none border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isSending || ended || isViolated}
                  className="shrink-0 w-11 h-11 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors"
                  aria-label="Send message"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className="text-center text-xs text-slate-400 mt-2">Press Enter to send · Shift+Enter for new line</p>
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Live Monitor (40%) ── */}
      <div className="border-l border-slate-200" style={{ width: '40%' }}>
        <MonitoringPanel
          messages={messages}
          results={monitoringResults}
          threshold={biasThreshold}
          isViolated={isViolated}
          violationType={violationType}
          violationReason={violationReason}
          isSending={isSending}
        />
      </div>

    </div>
  )
}
