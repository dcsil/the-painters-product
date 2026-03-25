'use client'

import { useState, useEffect } from 'react'
import TermsModal from './TermsModal'
import FeedbackButton from './FeedbackButton'

interface Props {
  isLoggedIn: boolean
  children: React.ReactNode
}

export default function ClientShell({ isLoggedIn, children }: Props) {
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isLoggedIn) {
      setTermsAccepted(true) // skip for unauthenticated users
      return
    }
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setTermsAccepted(!!data.termsAcceptedAt)
      })
      .catch(() => {
        // On error, allow access rather than blocking forever
        setTermsAccepted(true)
      })
  }, [isLoggedIn])

  return (
    <>
      {/* Block the UI until terms check resolves */}
      {isLoggedIn && termsAccepted === false && (
        <TermsModal onAccepted={() => setTermsAccepted(true)} />
      )}
      <FeedbackButton isLoggedIn={isLoggedIn} />
      {children}
    </>
  )
}
