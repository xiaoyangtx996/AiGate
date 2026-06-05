import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  agent: { id: 'id', name: 'name', description: 'description', organizationId: 'organizationId' },
  prompt: { id: 'id', name: 'name', description: 'description', organizationId: 'organizationId' },
  channel: { id: 'id', name: 'name', vendor: 'vendor', organizationId: 'organizationId' },
  mcpTool: { id: 'id', name: 'name', description: 'description', organizationId: 'organizationId' },
}))

import searchHandler from '../search/index.get'

function normalizeSearchKeyword(raw: unknown): string {
  return String(raw || '').trim()
}

function shouldReturnEmptyResults(keyword: string): boolean {
  return keyword.length < 2
}

function buildSearchPattern(keyword: string): string {
  return `%${keyword}%`
}

type RawSearchRow = { id: string, name: string, description?: string | null }

function formatSearchResults(rows: {
  agents: RawSearchRow[]
  prompts: RawSearchRow[]
  channels: Array<RawSearchRow & { description?: string | null }>
  tools: RawSearchRow[]
}) {
  return [
    ...rows.agents.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      type: 'Agent',
      url: `/aigate/agents/edit/${a.id}`,
    })),
    ...rows.prompts.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      type: 'Prompt',
      url: '/aigate/prompts',
    })),
    ...rows.channels.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      type: 'Channel',
      url: `/aigate/channels/${c.id}`,
    })),
    ...rows.tools.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      type: 'MCP Tool',
      url: '/aigate/mcp-tools',
    })),
  ]
}

function createSearchSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

describe('aigate search handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('pure search keyword helpers', () => {
    it('should trim and normalize keyword input', () => {
      expect(normalizeSearchKeyword('  hello  ')).toBe('hello')
      expect(normalizeSearchKeyword(undefined)).toBe('')
      expect(normalizeSearchKeyword(null)).toBe('')
    })

    it('should treat keywords shorter than 2 chars as empty search', () => {
      expect(shouldReturnEmptyResults('')).toBe(true)
      expect(shouldReturnEmptyResults('a')).toBe(true)
      expect(shouldReturnEmptyResults('ab')).toBe(false)
    })

    it('should build ilike pattern from keyword', () => {
      expect(buildSearchPattern('gpt')).toBe('%gpt%')
      expect(buildSearchPattern('open ai')).toBe('%open ai%')
    })
  })

  describe('pure search result formatting', () => {
    it('should map each entity type to the correct url and label', () => {
      const formatted = formatSearchResults({
        agents: [{ id: 'a1', name: 'Agent One', description: 'desc' }],
        prompts: [{ id: 'p1', name: 'Prompt One', description: null }],
        channels: [{ id: 'c1', name: 'Channel One', description: 'OpenAI' }],
        tools: [{ id: 't1', name: 'Tool One', description: 'tool desc' }],
      })

      expect(formatted).toEqual([
        { id: 'a1', name: 'Agent One', description: 'desc', type: 'Agent', url: '/aigate/agents/edit/a1' },
        { id: 'p1', name: 'Prompt One', description: null, type: 'Prompt', url: '/aigate/prompts' },
        { id: 'c1', name: 'Channel One', description: 'OpenAI', type: 'Channel', url: '/aigate/channels/c1' },
        { id: 't1', name: 'Tool One', description: 'tool desc', type: 'MCP Tool', url: '/aigate/mcp-tools' },
      ])
    })

    it('should preserve result order: agents, prompts, channels, tools', () => {
      const formatted = formatSearchResults({
        agents: [{ id: 'a1', name: 'A' }],
        prompts: [{ id: 'p1', name: 'P' }],
        channels: [{ id: 'c1', name: 'C', description: 'v' }],
        tools: [{ id: 't1', name: 'T' }],
      })

      expect(formatted.map(item => item.type)).toEqual(['Agent', 'Prompt', 'Channel', 'MCP Tool'])
    })
  })

  describe('search index.get', () => {
    it('should return empty array when keyword is too short', async () => {
      const response = await searchHandler(createMockEvent({ query: { keyword: 'a' } }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual([])
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return empty array for whitespace-only keyword', async () => {
      const response = await searchHandler(createMockEvent({ query: { keyword: '   ' } }))

      expect(response.data).toEqual([])
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should query all entity types and format merged results', async () => {
      const agents = [{ id: 'agent-1', name: 'Support Bot', description: 'help' }]
      const prompts = [{ id: 'prompt-1', name: 'Greeting', description: null }]
      const channels = [{ id: 'channel-1', name: 'Main', description: 'OpenAI' }]
      const tools = [{ id: 'tool-1', name: 'GitHub MCP', description: 'repo' }]

      mockSelect
        .mockReturnValueOnce(createSearchSelectChain(agents))
        .mockReturnValueOnce(createSearchSelectChain(prompts))
        .mockReturnValueOnce(createSearchSelectChain(channels))
        .mockReturnValueOnce(createSearchSelectChain(tools))

      const response = await searchHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { keyword: '  git  ' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(formatSearchResults({ agents, prompts, channels, tools }))
      expect(mockSelect).toHaveBeenCalledTimes(4)
    })
  })
})
