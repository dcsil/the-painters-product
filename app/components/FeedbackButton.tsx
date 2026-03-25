'use client'

import { useState } from 'react'

const CATEGORIES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'general', label: 'General Feedback' },
] as const

type Category = (typeof CATEGORIES)[number]['value']

interface Props {
  isLoggedIn: boolean
}

export default function FeedbackButton({ isLoggedIn }: Props) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>('general')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  if (!isLoggedIn) return null

  async function handleSubmit() {
    if (!message.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message: message.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('success')
      setTimeout(() => {
        setOpen(false)
        setMessage('')
        setCategory('general')
        setStatus('idle')
      }, 1500)
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        title="Send feedback"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg
          bg-slate-900 text-white text-sm font-medium
          hover:scale-105 transition-transform"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M21 16a2 2 0 01-2 2H7l-4 4V6a2 2 0 012-2h14a2 2 0 012 2v10z"
          />
        </svg>
        Feedback
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 pt-6 pb-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Send Feedback</h3>
              <button
                onClick={() => { setOpen(false); setStatus('idle'); setMessage(''); }}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {status === 'success' ? (
                <div className="text-center py-4">
                  <div className="text-3xl mb-2">✓</div>
                  <p className="font-medium text-neutral-900">Thanks for your feedback!</p>
                  <p className="text-sm text-neutral-500 mt-1">It helps us improve Oversight.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={2000}
                      rows={5}
                      placeholder="Describe a bug, suggest a feature, or share any thoughts…"
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                    />
                    <p className="text-xs text-neutral-400 mt-1 text-right">{message.length}/2000</p>
                  </div>

                  {status === 'error' && (
                    <p className="text-sm text-red-600">Failed to send. Please try again.</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => { setOpen(false); setStatus('idle'); setMessage(''); }}
                      className="flex-1 py-2 rounded-lg border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!message.trim() || status === 'loading'}
                      className="flex-1 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {status === 'loading' ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
