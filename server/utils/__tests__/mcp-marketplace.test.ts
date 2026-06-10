import { describe, expect, it } from 'vitest'
import { MCP_MARKETPLACE_PRESETS } from '../mcp-marketplace'

describe('mCP_MARKETPLACE_PRESETS', () => {
  it('has at least 10 presets', () => {
    expect(MCP_MARKETPLACE_PRESETS.length).toBeGreaterThanOrEqual(10)
  })

  it('each preset has required fields', () => {
    for (const preset of MCP_MARKETPLACE_PRESETS) {
      expect(preset.id).toBeTruthy()
      expect(preset.name).toBeTruthy()
      expect(preset.type).toBeTruthy()
      expect(preset.endpoint).toBeTruthy()
    }
  })
})
