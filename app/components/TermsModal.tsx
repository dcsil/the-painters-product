'use client'

import { useState } from 'react'
import { RATE_LIMITS } from '@/lib/rate-limit-config'

const CURRENT_TERMS_VERSION = 'alpha-1'

interface Props {
  onAccepted: () => void
}

export default function TermsModal({ onAccepted }: Props) {
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    if (!checked) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termsAccepted: true }),
      })
      if (!res.ok) throw new Error('Failed to save acceptance')
      onAccepted()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onKeyDown={(e) => e.key === 'Escape' && e.preventDefault()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 border-b border-neutral-200 flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🎨</span>
            <h2 className="text-xl font-bold text-neutral-900">
              Welcome to Oversight Alpha
            </h2>
          </div>
          <p className="text-sm text-neutral-500">
            You have been selected as an alpha tester. Please read and accept the terms below to continue.
          </p>
        </div>

        {/* Scrollable body */}
        <div className="px-8 py-6 overflow-y-auto flex-1 text-sm text-neutral-700 space-y-4 leading-relaxed">
          <section>
            <h3 className="font-semibold text-neutral-900 mb-1">1. Alpha Testing Program</h3>
            <p>
              You have been invited to participate in the closed alpha testing program for <strong>Oversight</strong>, an AI conversation analysis platform developed by The pAInters. This program is designed to gather early feedback before public release. Your participation is voluntary and confidential.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-neutral-900 mb-1">2. Purpose of Use</h3>
            <p>
              You agree to use Oversight solely for testing and evaluation purposes during the alpha period. You will not use the platform for production workloads, commercial purposes, or to process data that requires guaranteed uptime or data retention.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-neutral-900 mb-1">3. Confidentiality</h3>
            <p>
              The features, user interface, and functionality you encounter during alpha are confidential. You agree not to publicly share screenshots, recordings, or detailed descriptions of the product without prior written consent from The pAInters team.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-neutral-900 mb-1">4. No Guarantees</h3>
            <p>
              This is pre-release software. Oversight is provided &ldquo;as-is&rdquo; during the alpha period. There is no Service Level Agreement (SLA), no guaranteed uptime, and no guarantee of data persistence. The platform may be reset, modified, or taken offline at any time without notice.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-neutral-900 mb-1">5. Feedback Obligation</h3>
            <p>
              As an alpha tester, you agree to provide honest feedback about your experience using the in-app feedback tool (the button in the bottom-right corner). Your feedback — including bugs, usability issues, and feature requests — is essential to improving the product before public launch.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-neutral-900 mb-1">6. Rate Limits</h3>
            <p>
              To ensure fair access and system stability during alpha, the following usage limits apply per account:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>File uploads:</strong> {RATE_LIMITS.upload.perMinute} per minute, {RATE_LIMITS.upload.perDay} per day</li>
              <li><strong>Live chat sessions:</strong> {RATE_LIMITS.chat.perMinute} per minute, {RATE_LIMITS.chat.perDay} per day</li>
            </ul>
            <p className="mt-2">
              These limits may be adjusted as the alpha progresses. You can view your current limits at any time in the Settings page.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-neutral-900 mb-1">7. Data Usage</h3>
            <p>
              Conversation data you upload during alpha may be used by The pAInters team to improve analysis accuracy. You should not upload conversations containing personally identifiable information (PII) or sensitive business data during the alpha period.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-neutral-900 mb-1">8. Termination</h3>
            <p>
              The pAInters team reserves the right to revoke alpha access at any time. The alpha testing period will conclude when the product moves to public release, at which point these terms will be superseded by the general Terms of Service.
            </p>
          </section>

          <p className="text-xs text-neutral-400 pt-2">
            Alpha Tester Agreement · Version {CURRENT_TERMS_VERSION} · Effective March 2026
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-neutral-200 flex-shrink-0 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-slate-900 flex-shrink-0"
            />
            <span className="text-sm text-neutral-700">
              I have read and agree to the Alpha Tester Terms above. I understand this is pre-release software with no uptime guarantees.
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleAccept}
            disabled={!checked || loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-colors
              bg-slate-900 text-white hover:bg-slate-700
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving…' : 'Accept & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
