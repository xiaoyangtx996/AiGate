import { eq } from 'drizzle-orm'
import { requireRequestPrincipal } from '#server/utils/context'
import { db } from '@/db/drizzle'
import { user } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = await requireRequestPrincipal(event)
    const [currentUser] = await db
      .select({ mustChangePassword: user.mustChangePassword })
      .from(user)
      .where(eq(user.id, principal.userId))

    return responseSuccess({ mustChangePassword: currentUser?.mustChangePassword === true })
  }
  catch (err) {
    return responseError(err)
  }
})
