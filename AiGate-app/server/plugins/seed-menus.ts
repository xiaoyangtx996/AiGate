import { seedDefaultMenus } from '#server/utils/default-menus'
import { db } from '@/db/drizzle'

export default defineNitroPlugin(async () => {
  try {
    await seedDefaultMenus(db)
  }
  catch (error) {
    console.error('[seed] failed to seed default menus:', error)
  }
})
