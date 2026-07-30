import { describe, expect, it } from 'vitest'
import { estimateTokensFromText, parseNonStreamUsage, parseStreamChunkUsage } from '#server/utils/gateway-usage'

describe('parseNonStreamUsage', () => {
  it('parses OpenAI usage', () => {
    const body = JSON.stringify({ usage: { prompt_tokens: 12, completion_tokens: 34, total_tokens: 46 } })
    expect(parseNonStreamUsage('openai', body)).toEqual({
      inputTokens: 12,
      outputTokens: 34,
      totalTokens: 46,
      tokensEstimated: false,
    })
  })

  it('parses Anthropic usage', () => {
    const body = JSON.stringify({ usage: { input_tokens: 5, output_tokens: 7 } })
    expect(parseNonStreamUsage('anthropic', body)).toEqual({
      inputTokens: 5,
      outputTokens: 7,
      totalTokens: 12,
      tokensEstimated: false,
    })
  })

  it('falls back to char estimate when usage missing', () => {
    const body = JSON.stringify({ choices: [{ message: { content: 'abcd' } }] })
    const result = parseNonStreamUsage('openai', body, 'hello')
    expect(result.tokensEstimated).toBe(true)
    expect(result.totalTokens).toBeGreaterThan(0)
  })
})

describe('parseStreamChunkUsage', () => {
  it('accumulates OpenAI stream usage from final chunk', () => {
    const line = 'data: {"usage":{"prompt_tokens":3,"completion_tokens":9,"total_tokens":12}}'
    expect(parseStreamChunkUsage('openai', line)).toEqual({
      inputTokens: 3,
      outputTokens: 9,
      totalTokens: 12,
    })
  })

  it('parses Anthropic message_delta usage', () => {
    const line = 'data: {"type":"message_delta","usage":{"output_tokens":4,"input_tokens":2}}'
    expect(parseStreamChunkUsage('anthropic', line)).toEqual({
      inputTokens: 2,
      outputTokens: 4,
      totalTokens: 6,
    })
  })
})

describe('estimateTokensFromText', () => {
  it('uses chars/4 heuristic for ASCII text', () => {
    expect(estimateTokensFromText('12345678').totalTokens).toBe(2)
  })

  it('does not undercount Chinese text as chars/4', () => {
    expect(estimateTokensFromText('你好世界').totalTokens).toBeGreaterThanOrEqual(4)
  })

  it('weights mixed Chinese and English text', () => {
    const result = estimateTokensFromText('你好world1234').totalTokens
    expect(result).toBeGreaterThanOrEqual(5)
    expect(result).toBeLessThanOrEqual(7)
  })
})
