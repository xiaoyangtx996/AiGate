import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { db } from '@/db/drizzle'
import { alert, member, user } from '@/db/schema'

function getResend() {
  const apiKey = process.env.NUXT_RESEND_API_KEY
  if (!apiKey) return null

  return new Resend(apiKey)
}

export async function sendAlertEmail(to: string, title: string, message: string, severity: string) {
  const resend = getResend()
  if (!resend) return null

  try {
    const color = severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#3b82f6'
    const result = await resend.emails.send({
      from: process.env.NUXT_RESEND_FROM || 'noreply@aigate.com',
      to,
      subject: `[AiGate] ${title}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:${color};">${title}</h2>
          <p style="color:#374151;line-height:1.6;">${message}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="color:#9ca3af;font-size:12px;">此邮件由 AiGate 系统自动发送</p>
        </div>
      `,
    })
    return result
  } catch {
    return null
  }
}

export async function notifyAlertSubscribers(alertId: string, channels: string[] = ['email']) {
  if (!channels.includes('email')) return

  const [alertRecord] = await db.select().from(alert).where(eq(alert.id, alertId))
  if (!alertRecord) return

  if (alertRecord.userId) {
    const [targetUser] = await db.select().from(user).where(eq(user.id, alertRecord.userId))
    if (targetUser?.email) {
      await sendAlertEmail(targetUser.email, alertRecord.title, alertRecord.message, alertRecord.severity)
    }
  }

  if (alertRecord.organizationId) {
    const orgMembers = await db
      .select({ email: user.email })
      .from(member)
      .leftJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, alertRecord.organizationId))

    for (const m of orgMembers) {
      if (m.email) {
        await sendAlertEmail(m.email, alertRecord.title, alertRecord.message, alertRecord.severity)
      }
    }
  }
}
