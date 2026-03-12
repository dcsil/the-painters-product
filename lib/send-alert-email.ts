import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface ViolationDetails {
  type: 'hallucination' | 'bias'
  messageContent: string
  biasScore?: number
  biasThreshold?: number
  reason?: string  // LLM explanation for why this was flagged
}

export interface ChatAlertEmailOptions {
  to: string
  sessionId: string
  uploadId: string
  messageCount: number
  dashboardUrl: string
  violationDetails?: ViolationDetails
}

export async function sendChatAnalysisAlert(options: ChatAlertEmailOptions): Promise<void> {
  const { to, sessionId, uploadId, messageCount, dashboardUrl, violationDetails } = options

  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping alert email')
    return
  }

  const from = process.env.ALERT_EMAIL_FROM ?? 'Oversight <alerts@oversight-app.com>'

  const isViolation = Boolean(violationDetails)
  const subject = isViolation
    ? '⚠ Chat session flagged — live agent required'
    : 'Chat conversation analysis complete'

  const violationHtml = violationDetails ? `
    <div style="margin-bottom: 24px; padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
      <p style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #b91c1c;">
        ⚠ Violation Detected — Live Agent Connected
      </p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 13px; width: 140px;">Issue type</td>
          <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #1e293b; text-transform: capitalize;">
            ${violationDetails.type === 'hallucination' ? 'Hallucination' : 'Bias'}
          </td>
        </tr>
        ${
          violationDetails.type === 'bias' && violationDetails.biasScore !== undefined
            ? `<tr>
                <td style="padding: 4px 0; color: #64748b; font-size: 13px;">Bias score</td>
                <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #b91c1c;">
                  ${violationDetails.biasScore}%
                  ${violationDetails.biasThreshold !== undefined ? `(threshold: ${violationDetails.biasThreshold}%)` : ''}
                </td>
              </tr>`
            : ''
        }
        ${
          violationDetails.reason
            ? `<tr>
                <td style="padding: 4px 0; color: #64748b; font-size: 13px; vertical-align: top;">Reason</td>
                <td style="padding: 4px 0; font-size: 13px; color: #1e293b; font-style: italic;">
                  ${escapeHtml(violationDetails.reason)}
                </td>
              </tr>`
            : ''
        }
      </table>
      <p style="margin: 12px 0 4px; color: #64748b; font-size: 13px;">Triggering message:</p>
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 12px; font-family: monospace; font-size: 12px; color: #334155; white-space: pre-wrap; word-break: break-word;">
        ${escapeHtml(violationDetails.messageContent)}
      </div>
    </div>
  ` : ''

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">
          ${isViolation ? '⚠ Chat session flagged' : 'Analysis complete'}
        </h2>
        <p style="color: #64748b; margin-bottom: 24px;">
          ${
            isViolation
              ? 'A live monitoring violation was detected during a customer chat session. <strong>A live agent should be connected ASAP.</strong> The conversation has been stopped automatically.'
              : 'A customer chat session has finished and the automated analysis is ready.'
          }
        </p>

        ${violationHtml}

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 140px;">Session ID</td>
            <td style="padding: 8px 0; font-size: 14px; font-family: monospace;">${sessionId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Messages</td>
            <td style="padding: 8px 0; font-size: 14px;">${messageCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Upload ID</td>
            <td style="padding: 8px 0; font-size: 14px; font-family: monospace;">${uploadId}</td>
          </tr>
        </table>

        <a
          href="${dashboardUrl}"
          style="display: inline-block; background: #0f172a; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;"
        >
          View Analysis Dashboard
        </a>

        <p style="margin-top: 32px; font-size: 12px; color: #94a3b8;">
          You are receiving this because an alert email is configured in your Oversight settings.
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('[email] Failed to send alert email:', error)
  } else {
    console.log(`[email] Alert sent to ${to} for session ${sessionId}${isViolation ? ' (violation)' : ''}`)
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
