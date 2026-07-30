export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  tokensEstimated?: boolean
}

function estimateTokenCount(text: string) {
  let hanChars = 0
  let asciiChars = 0
  let otherChars = 0

  for (const char of text) {
    if (/\p{Script=Han}/u.test(char)) {
      hanChars++
    }
    else if (/[A-Za-z0-9]/.test(char)) {
      asciiChars++
    }
    else if (!/\s/.test(char)) {
      otherChars++
    }
  }

  return Math.ceil(hanChars * 1.5 + (asciiChars + otherChars) / 4)
}

export function estimateTokensFromText(...parts: Array<string | undefined>): TokenUsage {
  const [inputText = '', ...outputParts] = parts
  const input = estimateTokenCount(inputText)
  const output = estimateTokenCount(outputParts.filter(Boolean).join(''))
  const total = Math.max(1, input + output)
  return {
    inputTokens: input,
    outputTokens: output,
    totalTokens: total,
    tokensEstimated: true,
  }
}

function normalizeVendor(vendor: string) {
  const v = vendor.toLowerCase()
  if (v.includes('anthropic') || v.includes('claude'))
    return 'anthropic'
  return 'openai'
}

export function parseNonStreamUsage(vendor: string, body: string, promptText?: string): TokenUsage {
  try {
    const parsed = JSON.parse(body)
    const kind = normalizeVendor(vendor)
    if (kind === 'anthropic' && parsed.usage) {
      const input = parsed.usage.input_tokens ?? 0
      const output = parsed.usage.output_tokens ?? 0
      return { inputTokens: input, outputTokens: output, totalTokens: input + output, tokensEstimated: false }
    }
    if (parsed.usage?.total_tokens != null || parsed.usage?.prompt_tokens != null || parsed.usage?.completion_tokens != null) {
      const input = parsed.usage.prompt_tokens ?? parsed.usage.input_tokens ?? 0
      const output = parsed.usage.completion_tokens ?? parsed.usage.output_tokens ?? 0
      const total = parsed.usage.total_tokens ?? input + output
      return {
        inputTokens: input,
        outputTokens: output || (total > input ? total - input : 0),
        totalTokens: total,
        tokensEstimated: false,
      }
    }
  }
  catch {}
  return estimateTokensFromText(promptText, body)
}

export function parseStreamChunkUsage(vendor: string, sseLine: string): Partial<TokenUsage> | null {
  if (!sseLine.startsWith('data: '))
    return null
  const payload = sseLine.slice(6).trim()
  if (!payload || payload === '[DONE]')
    return null
  try {
    const parsed = JSON.parse(payload)
    const kind = normalizeVendor(vendor)
    if (kind === 'anthropic' && parsed.usage) {
      const input = parsed.usage.input_tokens ?? 0
      const output = parsed.usage.output_tokens ?? 0
      return { inputTokens: input, outputTokens: output, totalTokens: input + output }
    }
    if (parsed.usage) {
      const input = parsed.usage.prompt_tokens ?? 0
      const output = parsed.usage.completion_tokens ?? 0
      const total = parsed.usage.total_tokens ?? input + output
      return { inputTokens: input, outputTokens: output, totalTokens: total }
    }
  }
  catch {}
  return null
}

export function mergeStreamUsage(acc: TokenUsage, chunk: Partial<TokenUsage>): TokenUsage {
  return {
    inputTokens: chunk.inputTokens ?? acc.inputTokens,
    outputTokens: chunk.outputTokens ?? acc.outputTokens,
    totalTokens: chunk.totalTokens ?? acc.totalTokens,
    tokensEstimated: acc.tokensEstimated,
  }
}
