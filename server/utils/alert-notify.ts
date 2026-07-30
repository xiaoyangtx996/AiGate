import { and, eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { getSetting } from '#server/utils/system-settings'
import { db } from '@/db/drizzle'
import { alert, member, user, userNotificationPref } from '@/db/schema'

function getResend() {
  const apiKey = process.env.NUXT_RESEND_API_KEY
  if (!apiKey)
    return null

  return new Resend(apiKey)
}

export async function sendAlertEmail(to: string, title: string, message: string, severity: string) {
  const resend = getResend()
  if (!resend)
    return null

  try {
    const color = severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#3b82f6'
    const configuredFrom = await getSetting<string>('notify.resendFrom').catch(() => '')
    const result = await resend.emails.send({
      from: configuredFrom || process.env.NUXT_RESEND_FROM || 'noreply@aigate.com',
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
  }
  catch {
    return null
  }
}

function parseRecipients(value: unknown) {
  return String(value || '')
    .split(/[\n,;]/)
    .map(item => item.trim())
    .filter(Boolean)
}

async function sendAlertWebhook(url: string, payload: unknown) {
  if (!url)
    return
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {})
}

export async function notifyAlertSubscribers(alertId: string, channels: string[] = ['email']) {
  const shouldEmail = channels.includes('email')
  const shouldWebhook = channels.includes('webhook')
  if (!shouldEmail && !shouldWebhook)
    return

  const [alertRecord] = await db.select().from(alert).where(eq(alert.id, alertId))
  if (!alertRecord)
    return
  const record = alertRecord

  async function canEmail(userId: string) {
    const [pref] = await db
      .select()
      .from(userNotificationPref)
      .where(and(eq(userNotificationPref.userId, userId), eq(userNotificationPref.alertType, record.type)))
    if (!pref)
      return true
    return pref.channels.includes('email')
  }

  if (shouldEmail && alertRecord.userId) {
    const [targetUser] = await db.select().from(user).where(eq(user.id, alertRecord.userId))
    if (targetUser?.email && await canEmail(targetUser.id)) {
      await sendAlertEmail(targetUser.email, alertRecord.title, alertRecord.message, alertRecord.severity)
    }
  }

  if (shouldEmail && alertRecord.organizationId) {
    const orgMembers = await db
      .select({ id: user.id, email: user.email })
      .from(member)
      .leftJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, alertRecord.organizationId))

    for (const m of orgMembers) {
      if (m.id && m.email && await canEmail(m.id)) {
        await sendAlertEmail(m.email, alertRecord.title, alertRecord.message, alertRecord.severity)
      }
    }
  }

  if (shouldEmail) {
    const extraRecipients = parseRecipients(await getSetting<string>('notify.emailRecipients').catch(() => ''))
    for (const email of extraRecipients)
      await sendAlertEmail(email, alertRecord.title, alertRecord.message, alertRecord.severity)
  }

  if (shouldWebhook) {
    const webhookUrl = await getSetting<string>('notify.webhookUrl').catch(() => '')
    await sendAlertWebhook(webhookUrl, {
      id: alertRecord.id,
      type: alertRecord.type,
      severity: alertRecord.severity,
      title: alertRecord.title,
      message: alertRecord.message,
      organizationId: alertRecord.organizationId,
      userId: alertRecord.userId,
      resourceId: alertRecord.resourceId,
    })
  }
}
