import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import searchHandler from '../search.get'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  agent: { id: 'id', name: 'name', description: 'description', organizationId: 'organizationId' },
  apiKey: { id: 'id', name: 'name', env: 'env', organizationId: 'organizationId' },
  knowledgeBase: { id: 'id', name: 'name', description: 'description', organizationId: 'organizationId' },
  mcpTool: { id: 'id', name: 'name', description: 'description', organizationId: 'organizationId' },
  organization: { id: 'id', name: 'name', level: 'level' },
  prompt: { id: 'id', name: 'name', description: 'description', organizationId: 'organizationId' },
  user: { id: 'id', name: 'name', email: 'email', username: 'username' },
}))

function createSearchSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

describe('aigate global search handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject unauthenticated requests', async () => {
    const response = await searchHandler(createMockEvent({ query: { q: 'agent' } }))

    expect(response.code).toBe(RESPONSE_CODE.UNAUTHORIZED)
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('should return empty array when keyword is too short', async () => {
    const response = await searchHandler(createMockEvent({
      context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
      query: { q: 'a' },
    }))

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual([])
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('should not search global resources for tenant user without organization context', async () => {
    const response = await searchHandler(createMockEvent({
      context: { principal: { userId: 'user-1', organizationId: null, isAdmin: false } },
      query: { q: 'agent' },
    }))

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual([])
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('should search all configured resource types and format merged results', async () => {
    const users = [{ id: 'user-1', name: 'Alice', email: 'alice@example.com', username: 'alice' }]
    const orgs = [{ id: 'org-1', name: 'Team One', level: 'company' }]
    const keys = [{ id: 'key-1', name: 'Prod Key', env: 'prod', organizationId: 'org-1' }]
    const tools = [{ id: 'tool-1', name: 'GitHub MCP', description: 'repo', organizationId: 'org-1' }]
    const kbs = [{ id: 'kb-1', name: 'Docs KB', description: 'docs', organizationId: 'org-1' }]
    const agents = [{ id: 'agent-1', name: 'Support Bot', description: 'support', organizationId: 'org-1' }]
    const prompts = [{ id: 'prompt-1', name: 'Greeting', description: 'hello', organizationId: 'org-1' }]

    mockSelect
      .mockReturnValueOnce(createSearchSelectChain(users))
      .mockReturnValueOnce(createSearchSelectChain(orgs))
      .mockReturnValueOnce(createSearchSelectChain(keys))
      .mockReturnValueOnce(createSearchSelectChain(tools))
      .mockReturnValueOnce(createSearchSelectChain(kbs))
      .mockReturnValueOnce(createSearchSelectChain(agents))
      .mockReturnValueOnce(createSearchSelectChain(prompts))

    const response = await searchHandler(createMockEvent({
      context: { principal: { userId: 'user-1', organizationId: 'org-1', isAdmin: false } },
      query: { keyword: '  agent  ' },
    }))

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual([
      {
        id: 'user-1',
        name: 'Alice',
        description: 'alice',
        type: 'User',
        url: '/system-settings/user-manage',
        title: 'Alice',
        subtitle: 'alice',
        route: '/system-settings/user-manage',
      },
      {
        id: 'org-1',
        name: 'Team One',
        description: 'company',
        type: 'Organization',
        url: '/aigate/organizations',
        title: 'Team One',
        subtitle: 'company',
        route: '/aigate/organizations',
      },
      {
        id: 'key-1',
        name: 'Prod Key',
        description: 'prod',
        type: 'API Key',
        url: '/aigate/api-keys',
        title: 'Prod Key',
        subtitle: 'prod',
        route: '/aigate/api-keys',
      },
      {
        id: 'tool-1',
        name: 'GitHub MCP',
        description: 'repo',
        type: 'MCP Tool',
        url: '/aigate/mcp-tools/tool-1',
        title: 'GitHub MCP',
        subtitle: 'repo',
        route: '/aigate/mcp-tools/tool-1',
      },
      {
        id: 'kb-1',
        name: 'Docs KB',
        description: 'docs',
        type: 'Knowledge Base',
        url: '/aigate/knowledge-base/kb-1',
        title: 'Docs KB',
        subtitle: 'docs',
        route: '/aigate/knowledge-base/kb-1',
      },
      {
        id: 'agent-1',
        name: 'Support Bot',
        description: 'support',
        type: 'Agent',
        url: '/aigate/agents/edit/agent-1',
        title: 'Support Bot',
        subtitle: 'support',
        route: '/aigate/agents/edit/agent-1',
      },
      {
        id: 'prompt-1',
        name: 'Greeting',
        description: 'hello',
        type: 'Prompt',
        url: '/aigate/prompts',
        title: 'Greeting',
        subtitle: 'hello',
        route: '/aigate/prompts',
      },
    ])
    expect(mockSelect).toHaveBeenCalledTimes(7)
  })
})
