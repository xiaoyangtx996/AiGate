import { asc, desc } from 'drizzle-orm'
import { merge } from 'es-toolkit'
import { db } from '@/db/drizzle'
import { internalization } from '@/db/schema'
import { defaultLocaleMessages } from '~~/shared/i18n/default-messages'

export default defineEventHandler(async () => {
  try {
    const data = await db
      .select()
      .from(internalization)
      .orderBy(
        asc(internalization.createdAt),
        desc(internalization.sort),
      )

    const localesTree = convertFlatDataToTree(data)
    const dbMessages = transformToLangTree(localesTree as InternalizationTree[])
    const result = {
      en: merge(defaultLocaleMessages.en, dbMessages.en ?? {}),
      'zh-CN': merge(defaultLocaleMessages['zh-CN'], dbMessages['zh-CN'] ?? {}),
      zh: merge(defaultLocaleMessages['zh-CN'], dbMessages['zh-CN'] ?? {}),
    }

    return responseSuccess(result)
  }
  catch (err) {
    return responseError(err)
  }
})
