import { describe, expect, it } from 'vitest'

function buildConversationTitle(agentName?: string | null) {
  return `${agentName || 'Agent'} 对话`
}

function normalizeTemperature(temperature?: number | null) {
  return (temperature ?? 30) / 100
}

function resolveMaxTokens(maxTokens?: number | null) {
  return maxTokens ?? 4096
}

function parseChatCompletionResponse(body: string) {
  let reply = body
  let usage: { total_tokens?: number } | null = null
  try {
    const parsed = JSON.parse(body)
    reply = parsed.choices?.[0]?.message?.content || body
    usage = parsed.usage ?? null
  } catch {}
  return { reply, usage }
}

function buildChatMessages(
  systemPrompt: string | null | undefined,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
) {
  const system = systemPrompt || 'You are a helpful assistant.'
  return [{ role: 'system', content: system }, ...history, { role: 'user', content: userMessage }]
}

describe('agent-chat utils', () => {
  describe('buildConversationTitle', () => {
    it('should use agent name when provided', () => {
      expect(buildConversationTitle('Support Bot')).toBe('Support Bot 对话')
    })

    it('should fall back to Agent when name is missing', () => {
      expect(buildConversationTitle(undefined)).toBe('Agent 对话')
      expect(buildConversationTitle(null)).toBe('Agent 对话')
      expect(buildConversationTitle('')).toBe('Agent 对话')
    })
  })

  describe('normalizeTemperature', () => {
    it('should convert stored temperature to model scale', () => {
      expect(normalizeTemperature(30)).toBe(0.3)
      expect(normalizeTemperature(0)).toBe(0)
      expect(normalizeTemperature(100)).toBe(1)
    })

    it('should default to 0.3 when temperature is missing', () => {
      expect(normalizeTemperature(undefined)).toBe(0.3)
      expect(normalizeTemperature(null)).toBe(0.3)
    })
  })

  describe('resolveMaxTokens', () => {
    it('should default to 4096 when maxTokens is missing', () => {
      expect(resolveMaxTokens(undefined)).toBe(4096)
      expect(resolveMaxTokens(null)).toBe(4096)
    })

    it('should preserve explicit maxTokens', () => {
      expect(resolveMaxTokens(8192)).toBe(8192)
    })
  })

  describe('parseChatCompletionResponse', () => {
    it('should extract assistant reply and usage from JSON body', () => {
      const body = JSON.stringify({
        choices: [{ message: { content: 'Hello there' } }],
        usage: { total_tokens: 42 },
      })

      expect(parseChatCompletionResponse(body)).toEqual({
        reply: 'Hello there',
        usage: { total_tokens: 42 },
      })
    })

    it('should fall back to raw body for non-JSON responses', () => {
      expect(parseChatCompletionResponse('plain text reply')).toEqual({
        reply: 'plain text reply',
        usage: null,
      })
    })

    it('should fall back to raw body when JSON lacks choices', () => {
      const body = JSON.stringify({ usage: { total_tokens: 10 } })
      expect(parseChatCompletionResponse(body)).toEqual({
        reply: body,
        usage: { total_tokens: 10 },
      })
    })
  })

  describe('buildChatMessages', () => {
    it('should prepend system prompt and append user message', () => {
      const history = [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
      ]
      expect(buildChatMessages('You are concise.', history, 'Next question')).toEqual([
        { role: 'system', content: 'You are concise.' },
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
        { role: 'user', content: 'Next question' },
      ])
    })

    it('should use default system prompt when agent prompt is empty', () => {
      expect(buildChatMessages(null, [], 'Hello')).toEqual([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ])
    })
  })
})
