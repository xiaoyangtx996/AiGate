import { defaultMenuSeeds } from '#server/utils/default-menus'
import { db } from '@/db/drizzle'
import { menu } from '@/db/schema'
import { count } from 'drizzle-orm'

export default defineNitroPlugin(async () => {
  try {
    const [{ value }] = await db.select({ value: count() }).from(menu)
    
    // 如果菜单表为空，插入默认菜单
    if (value === 0) {
      await db.insert(menu).values(defaultMenuSeeds)
      console.info(`[seed] inserted ${defaultMenuSeeds.length} default menu records`)
    }
    else {
      console.info(`[seed] ${value} menu records already exist, skipping seed`)
    }
  }
  catch (error) {
    console.error('[seed] failed to seed default menus:', error)
  }
})
