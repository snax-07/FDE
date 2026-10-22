import ENV from '../../config/env'

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  if (!ENV.resend_api_key || !ENV.auth_email_from || !ENV.auth_reset_url) {
    throw new Error('Password reset email is not configured')
  }

  const resetUrl = new URL(ENV.auth_reset_url)
  resetUrl.searchParams.set('token', token)

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ENV.resend_api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: ENV.auth_email_from,
      to: [email],
      subject: 'Reset your password',
      text: `Use this link to reset your password. It expires in one hour:\n\n${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`Password reset email delivery failed (HTTP ${response.status})`)
  }
}
