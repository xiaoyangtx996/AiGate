import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { role, updateRoleSchema } from '@/db/schema'
import { RESPONSE_CODE } from '@/enums'

export default defineEventHandler(async (event) => {
  try {
    const id = event.context.params!.id
    const body = await readBody(event)
    const parsed = updateRoleSchema.parse(body)

    if (!id) {
      return responseError(null, '缺少参数 id', { statusCode: 400 })
    }

    const [res] = await db.update(role).set(parsed).where(eq(role.id, id)).returning()
    return responseSuccess(res)
  }
  catch (error) {
    const dbError = (error as { cause?: { code?: string, constraint?: string } })?.cause

    if (dbError?.code === RESPONSE_CODE.UNIQUE_VIOLATION) {
      switch (dbError.constraint) {
        case 'role_name_unique':
          return responseError(null, '角色名称已存在', { statusCode: 400 })
        case 'role_code_unique':
          return responseError(null, '角色编码已存在', { statusCode: 400 })
        default:
          return responseError(null, '数据已存在', { statusCode: 400 })
      }
    }

    return responseError(error)
  }
})
