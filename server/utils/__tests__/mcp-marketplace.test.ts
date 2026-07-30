import { describe, expect, it } from 'vitest'
import { buildMcpToolFromPreset, findMcpPreset, MCP_MARKETPLACE_PRESETS } from '../mcp-marketplace'

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

  it('should reject installing presets when required env values are missing', () => {
    const preset = findMcpPreset('github')!

    expect(() => buildMcpToolFromPreset(preset, {}, 'org-1')).toThrow(/GITHUB_TOKEN/)
  })

  it('should replace env placeholders when building tool config', () => {
    const preset = findMcpPreset('github')!
    const tool = buildMcpToolFromPreset(preset, { GITHUB_TOKEN: 'ghp_test_token' }, 'org-1')

    expect(tool.organizationId).toBe('org-1')
    expect(tool.env).toEqual({ GITHUB_TOKEN: 'ghp_test_token' })
    expect(JSON.stringify(tool.config)).toContain('ghp_test_token')
    expect(JSON.stringify(tool.config)).not.toContain('<your-github-token>')
  })
})
