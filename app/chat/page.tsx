'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [ended, setEnded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isSending || ended) return

    setInput('')
    setError(null)
    setIsSending(true)

    // Optimistic update
    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to send message')
      }

      const data = await res.json()
      setSessionId(data.sessionId)
      setMessages(data.messages)
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
    if (!sessionId || isEnding || ended) return
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

  if (ended) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm leading-tight">Support Assistant</p>
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
              Online
            </span>
          </div>
        </div>
        {messages.length > 0 && (
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
              <div className="w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white rounded-br-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-3xl mx-auto w-full px-4 pb-2">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-red-700">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-white border-t border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message…"
            disabled={isSending || ended}
            rows={1}
            className="flex-1 resize-none border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isSending || ended}
            className="shrink-0 w-11 h-11 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors"
            aria-label="Send message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
