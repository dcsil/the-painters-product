import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface ChatAlertEmailOptions {
  to: string
  sessionId: string
  uploadId: string
  messageCount: number
  dashboardUrl: string
}

export async function sendChatAnalysisAlert(options: ChatAlertEmailOptions): Promise<void> {
  const { to, sessionId, uploadId, messageCount, dashboardUrl } = options

  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping alert email')
    return
  }

  const from = process.env.ALERT_EMAIL_FROM ?? 'Oversight <alerts@oversight-app.com>'

  const { error } = await resend.emails.send({
    from,
    to,
    subject: 'Chat conversation analysis complete',
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Analysis complete</h2>
        <p style="color: #64748b; margin-bottom: 24px;">
          A customer chat session has finished and the automated analysis is ready.
        </p>

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
    console.log(`[email] Alert sent to ${to} for session ${sessionId}`)
  }
}
