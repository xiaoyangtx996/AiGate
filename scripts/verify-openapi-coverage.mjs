import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/* eslint-disable style/arrow-parens */

const apiRoots = [
  'server/api/aigate',
  'server/api/gateway',
  'server/api/system-settings',
]

const methodBySuffix = {
  get: 'get',
  post: 'post',
  put: 'put',
  delete: 'delete',
  patch: 'patch',
}
const routeFileExtensionRE = /\.ts$/
const slashRE = /\\/g
const successStatusRE = /^2\d\d$/
const openApiMethods = Object.values(methodBySuffix)
const schemaStrictMode = process.env.OPENAPI_STRICT_SCHEMAS === '1'
const genericSuccessResponseRefs = new Set([
  '#/components/schemas/ApiResponse',
  '#/components/schemas/PaginatedResponse',
])

function getResponseSchema(response) {
  return response?.content?.['application/json']?.schema
    ?? Object.values(response?.content ?? {})[0]?.schema
}

function walk(dir) {
  return readdirSync(dir).flatMap(entry => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory())
      return walk(fullPath)

    if (!entry.endsWith('.ts') || entry.includes('.test.') || fullPath.includes(`${sep}__tests__${sep}`))
      return []

    return [fullPath]
  })
}

function segmentToOpenApi(segment) {
  if (segment === 'index')
    return ''

  if (segment.startsWith('[...') && segment.endsWith(']'))
    return `{${segment.slice(4, -1)}}`

  if (segment.startsWith('[') && segment.endsWith(']'))
    return `{${segment.slice(1, -1)}}`

  return segment
}

function routeFromFile(file) {
  const relativePath = relative('server/api', file).replace(slashRE, '/')
  const parts = relativePath.replace(routeFileExtensionRE, '').split('/')
  const filename = parts.pop() ?? ''
  const filenameParts = filename.split('.')
  const method = methodBySuffix[filenameParts.at(-1)] ?? 'get'
  const routeName = methodBySuffix[filenameParts.at(-1)] ? filenameParts.slice(0, -1).join('.') : filename
  const segments = [...parts, routeName].map(segmentToOpenApi).filter(Boolean)

  return {
    path: `/${segments.join('/')}`,
    method,
  }
}

const expectedRoutes = apiRoots.flatMap(root => walk(root)).map(routeFromFile)

const openapi = JSON.parse(readFileSync('docs/openapi.json', 'utf8'))
const paths = openapi.paths ?? {}
const components = openapi.components ?? {}
const schemas = components.schemas ?? {}
const responses = components.responses ?? {}

const missing = expectedRoutes.filter(({ path, method }) => !paths[path]?.[method])

if (missing.length) {
  console.error('OpenAPI coverage check failed. Missing operations:')
  for (const route of missing) {
    console.error(`- ${route.method.toUpperCase()} ${route.path}`)
  }
  process.exit(1)
}

const requiredResponses = [
  'BadRequest',
  'Unauthorized',
  'Forbidden',
  'NotFound',
  'Conflict',
  'ServerError',
  'ErrorResponse',
]
const missingErrorComponents = [
  ...(!schemas.ErrorResponse ? ['schema: ErrorResponse'] : []),
  ...requiredResponses.filter(name => !responses[name]).map(name => `response: ${name}`),
]

if (missingErrorComponents.length) {
  console.error('OpenAPI error contract check failed. Missing components:')
  for (const item of missingErrorComponents) {
    console.error(`- ${item}`)
  }
  process.exit(1)
}

const missingDefaultErrorResponses = []
const missingSuccessResponseSchemas = []
const missingRequestBodySchemas = []
const genericSuccessResponses = []
for (const [path, methods] of Object.entries(paths)) {
  for (const [method, operation] of Object.entries(methods ?? {})) {
    if (!openApiMethods.includes(method))
      continue

    const successResponse = Object.entries(operation.responses ?? {})
      .find(([status]) => successStatusRE.test(status))
    const successSchema = getResponseSchema(successResponse?.[1])
    if (!successSchema) {
      missingSuccessResponseSchemas.push({ path, method })
    }
    if (genericSuccessResponseRefs.has(successSchema?.$ref)) {
      genericSuccessResponses.push({ path, method })
    }

    const requestBodySchema = operation.requestBody?.content?.['application/json']?.schema
    if (operation.requestBody && !requestBodySchema) {
      missingRequestBodySchemas.push({ path, method })
    }

    if (!operation.responses?.default) {
      missingDefaultErrorResponses.push({ path, method })
    }
  }
}

if (missingDefaultErrorResponses.length) {
  console.error('OpenAPI error contract check failed. Missing default error responses:')
  for (const route of missingDefaultErrorResponses) {
    console.error(`- ${route.method.toUpperCase()} ${route.path}`)
  }
  process.exit(1)
}

if (missingSuccessResponseSchemas.length || missingRequestBodySchemas.length) {
  if (missingSuccessResponseSchemas.length) {
    console.error('OpenAPI schema contract check failed. Missing success response schemas:')
    for (const route of missingSuccessResponseSchemas) {
      console.error(`- ${route.method.toUpperCase()} ${route.path}`)
    }
  }
  if (missingRequestBodySchemas.length) {
    console.error('OpenAPI schema contract check failed. Missing request body schemas:')
    for (const route of missingRequestBodySchemas) {
      console.error(`- ${route.method.toUpperCase()} ${route.path}`)
    }
  }
  process.exit(1)
}

if (genericSuccessResponses.length) {
  const message = 'OpenAPI schema quality check found generic success response schemas.'
  if (schemaStrictMode) {
    console.error(message)
    for (const route of genericSuccessResponses) {
      console.error(`- ${route.method.toUpperCase()} ${route.path}`)
    }
    process.exit(1)
  }

  console.warn(`${message} Set OPENAPI_STRICT_SCHEMAS=1 to fail on these.`)
  console.warn(`Generic success responses: ${genericSuccessResponses.length}`)
}

const operationCount = Object.values(paths).reduce((sum, methods) => sum + Object.keys(methods ?? {}).length, 0)

console.log('OpenAPI coverage OK.')
console.log(`Expected operations: ${expectedRoutes.length}`)
console.log(`Spec paths: ${Object.keys(paths).length}`)
console.log(`Spec operations: ${operationCount}`)
console.log(`Detailed success schemas: ${operationCount - genericSuccessResponses.length}`)
