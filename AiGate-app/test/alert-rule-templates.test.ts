import { describe, expect, it } from 'vitest'
import {
  getAlertRuleTemplate,
  normalizeAlertRuleInput,
  normalizeNotifyChannels,
} from '~~/shared/alert-rule-templates'

describe('alert rule templates', () => {
  it('should resolve quota templates', () => {
    expect(getAlertRuleTemplate('quota_70')).toMatchObject({
      type: 'quota_warning',
      threshold: 70,
      notifyChannels: ['in_app'],
    })
  })

  it('should normalize notify channels', () => {
    expect(normalizeNotifyChannels(['email', 'unknown'])).toEqual(['email'])
    expect(normalizeNotifyChannels([])).toEqual(['in_app'])
    expect(normalizeNotifyChannels(null)).toEqual(['in_app', 'email'])
  })

  it('should apply template defaults to alert rule input', () => {
    expect(normalizeAlertRuleInput({
      name: 'Quota critical',
      condition: { templateId: 'quota_100' },
    })).toEqual({
      name: 'Quota critical',
      type: 'quota_warning',
      enabled: true,
      condition: {
        templateId: 'quota_100',
        threshold: 100,
      },
      notifyChannels: ['in_app', 'email'],
    })
  })
})
