import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import storageDeleteHandler from '../storage-instance/[id].delete'
import storagePutHandler from '../storage-instance/[id].put'
import storageGetHandler from '../storage-instance/index.get'
import storagePostHandler from '../storage-instance/index.post'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

const storageSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean().optional(),
  status: z.string().optional(),
})

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  storageInstance: {
    id: 'id',
    name: 'name',
    createdAt: 'createdAt',
  },
  insertStorageInstanceSchema: {
    parse: (body: unknown) => storageSchema.required({ name: true }).parse(body),
  },
  updateStorageInstanceSchema: {
    parse: (body: unknown) => storageSchema.parse(body),
  },
}))

function createListSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createUpdateChain(result: unknown[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function createDeleteChain(result: unknown[]) {
  return {
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('aigate storage-instance handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list storage instances for organization principal', async () => {
    const items = [{ id: 'storage-1', name: 'Built-in PGVector', type: 'pgvector' }]
    mockSelect.mockReturnValue(createListSelectChain(items))

    const response = await storageGetHandler(
      createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual(items)
  })

  it('should reject non-admin create', async () => {
    const response = await storagePostHandler(
      createMockEvent({
        context: { principal: { isAdmin: false, organizationId: 'org-1' } },
        body: { name: 'External Vector' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('should create pgvector storage instance for admin and ignore requested type', async () => {
    const created = { id: 'storage-1', name: 'Vector', type: 'pgvector', category: 'vector' }
    const insertChain = createInsertChain([created])
    mockInsert.mockReturnValue(insertChain)

    const response = await storagePostHandler(
      createMockEvent({
        context: { principal: { isAdmin: true } },
        body: { name: 'Vector', type: 'milvus', category: 'search' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual(created)
    expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ type: 'pgvector', category: 'vector' }))
  })

  it('should update pgvector storage instance for admin', async () => {
    const updated = { id: 'storage-1', name: 'Renamed', type: 'pgvector', category: 'vector' }
    const updateChain = createUpdateChain([updated])
    mockUpdate.mockReturnValue(updateChain)

    const response = await storagePutHandler(
      createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'storage-1' },
        body: { name: 'Renamed', type: 'milvus' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual(updated)
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ name: 'Renamed', type: 'pgvector', category: 'vector' }))
  })

  it('should return 404 when updating missing storage instance', async () => {
    mockUpdate.mockReturnValue(createUpdateChain([]))

    const response = await storagePutHandler(
      createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'missing' },
        body: { name: 'Missing' },
      }),
    )

    expect(response.code).toBe(404)
  })

  it('should delete storage instance for admin', async () => {
    mockDelete.mockReturnValue(createDeleteChain([{ id: 'storage-1' }]))

    const response = await storageDeleteHandler(
      createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'storage-1' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toBeNull()
  })
})
