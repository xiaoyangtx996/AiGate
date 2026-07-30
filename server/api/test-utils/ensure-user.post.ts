import { auth } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV !== 'test' && process.env.ALLOW_E2E_TEST_UTILS !== '1') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const body = await readBody(event).catch(() => ({})) as {
    username?: string
    password?: string
    name?: string
  }

  const username = String(body.username || '').trim()
  const password = String(body.password || '').trim()
  const name = String(body.name || username).trim()

  if (!username || !password)
    return responseError(null, 'username and password are required', { statusCode: 400 })

  const email = `${username}@aigate.local`

  try {
    await auth.api.createUser({
      body: {
        email,
        password,
        name,
        data: {
          username,
          displayUsername: username,
        },
      },
    } as Parameters<typeof auth.api.createUser>[0])
    return responseSuccess({ ok: true, action: 'created', username, email })
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (
      message.includes('already')
      || message.includes('exists')
      || message.includes('USER_ALREADY_EXISTS')
    ) {
      return responseSuccess({ ok: true, action: 'exists', username, email })
    }
    return responseError(err)
  }
})
