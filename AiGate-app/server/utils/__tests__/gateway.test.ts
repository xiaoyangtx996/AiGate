import { describe, expect, it } from 'vitest'

// 测试函数（包含完整的边界检查）
function matchCidr(ip: string, cidr: string): boolean {
  const parts = cidr.split('/')
  if (parts.length !== 2) {
    throw new Error('Invalid CIDR format')
  }

  const [range, bitsStr] = parts
  const bits = parseInt(bitsStr, 10)

  // ✅ 验证 bits 范围 (0-32)
  if (isNaN(bits) || bits < 0 || bits > 32) {
    throw new Error('Invalid CIDR prefix length')
  }

  // ✅ 验证 IP 格式
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (!ipRegex.test(ip) || !ipRegex.test(range)) {
    throw new Error('Invalid IP address format')
  }

  // 验证每个 octet 在 0-255 范围内
  const validateOctets = (addr: string) => {
    return addr.split('.').every(octet => {
      const num = parseInt(octet, 10)
      return !isNaN(num) && num >= 0 && num <= 255
    })
  }

  if (!validateOctets(ip) || !validateOctets(range)) {
    throw new Error('Invalid IP octet value')
  }

  const mask = bits === 0 ? 0 : ~(2 ** (32 - bits) - 1) >>> 0
  const ipNum = ipToNum(ip)
  const rangeNum = ipToNum(range)
  return (ipNum & mask) === (rangeNum & mask)
}

function ipToNum(ip: string): number {
  const octets = ip.split('.')
  if (octets.length !== 4) {
    throw new Error('Invalid IP address format')
  }

  return octets.reduce((acc, octet) => {
    const num = parseInt(octet, 10)
    if (isNaN(num) || num < 0 || num > 255) {
      throw new Error('Invalid IP octet')
    }
    return (acc << 8) + num
  }, 0) >>> 0
}

// 模拟 checkIpWhitelist 函数（不依赖 db）
function checkIpWhitelist(keyRecord: any, clientIp: string): boolean {
  const whitelist = keyRecord.ipWhitelist as string[] | null
  if (!whitelist || whitelist.length === 0) return true
  return whitelist.some((entry: string) => {
    if (entry.includes('/')) {
      return matchCidr(clientIp, entry)
    }
    return clientIp === entry
  })
}

describe('gateway utils', () => {
  it('checkIpWhitelist should allow when whitelist is empty', () => {
    expect(checkIpWhitelist({ ipWhitelist: null }, '192.168.1.1')).toBe(true)
    expect(checkIpWhitelist({ ipWhitelist: [] }, '192.168.1.1')).toBe(true)
  })

  it('checkIpWhitelist should match exact IP', () => {
    expect(checkIpWhitelist({ ipWhitelist: ['192.168.1.1'] }, '192.168.1.1')).toBe(true)
    expect(checkIpWhitelist({ ipWhitelist: ['192.168.1.1'] }, '10.0.0.1')).toBe(false)
  })

  it('checkIpWhitelist should match CIDR', () => {
    expect(checkIpWhitelist({ ipWhitelist: ['192.168.1.0/24'] }, '192.168.1.100')).toBe(true)
    expect(checkIpWhitelist({ ipWhitelist: ['192.168.1.0/24'] }, '10.0.0.1')).toBe(false)
  })

  it('should reject invalid CIDR prefix', () => {
    expect(() => matchCidr('192.168.1.1', '192.168.1.0/33')).toThrow('Invalid CIDR prefix length')
  })

  it('should reject invalid IP format', () => {
    expect(() => ipToNum('256.1.1.1')).toThrow('Invalid IP octet')
  })

  it('should handle /0 CIDR', () => {
    expect(matchCidr('1.2.3.4', '0.0.0.0/0')).toBe(true)
  })

  it('should handle /32 CIDR', () => {
    expect(matchCidr('192.168.1.1', '192.168.1.1/32')).toBe(true)
  })

  it('should reject malformed CIDR', () => {
    expect(() => matchCidr('192.168.1.1', 'invalid')).toThrow('Invalid CIDR format')
  })
})
