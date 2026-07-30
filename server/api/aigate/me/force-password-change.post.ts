import { hashPassword } from 'better-auth/crypto'
import { and, eq, isNotNull } from 'drizzle-orm'
import { z } from 'zod'
import { requireRequestPrincipal } from '#server/utils/context'
import { db } from '@/db/drizzle'
import { account, user } from '@/db/schema'

const bodySchema = z.object({
  newPassword: z.string().min(8),
})

export default defineEventHandler(async (event) => {
  try {
    const principal = await requireRequestPrincipal(event)
    const body = bodySchema.parse(await readBody(event))
    const [currentUser] = await db
      .select({ id: user.id, mustChangePassword: user.mustChangePassword })
      .from(user)
      .where(eq(user.id, principal.userId))

    if (!currentUser)
      return responseError(null, '用户不存在', { statusCode: 404 })
    if (!currentUser.mustChangePassword)
      return responseError(null, '当前账号不需要强制修改密码', { statusCode: 400 })

    const hashedPassword = await hashPassword(body.newPassword)
    const updatedAccounts = await db
      .update(account)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(and(
        eq(account.userId, principal.userId),
        eq(account.providerId, 'credential'),
        isNotNull(account.password),
      ))
      .returning({ id: account.id })

    if (updatedAccounts.length === 0)
      return responseError(null, '当前账号没有密码凭证', { statusCode: 400 })

    await db
      .update(user)
      .set({ mustChangePassword: false, updatedAt: new Date() })
      .where(eq(user.id, principal.userId))

    return responseSuccess({ ok: true })
  }
  catch (err) {
    return responseError(err)
  }
})
