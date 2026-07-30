import type { Buffer } from 'node:buffer'
import { inflateRawSync } from 'node:zlib'

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/
const STRIP_QUOTES_RE = /^['"]|['"]$/g
const BINARY_EXT_RE = /\.(?:png|jpg|jpeg|gif|webp|zip|exe|dll|pdf)$/i
const BACKSLASH_RE = /\\/g
const LEADING_SLASHES_RE = /^\/+/

export function parseSkillFrontmatter(content: string) {
  const match = content.match(FRONTMATTER_RE)
  if (!match) {
    return { name: 'Untitled Skill', description: '', body: content }
  }
  const meta = Object.fromEntries(
    match[1]!
      .split('\n')
      .map((line) => {
        const index = line.indexOf(':')
        if (index < 0)
          return null
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(STRIP_QUOTES_RE, '')]
      })
      .filter((item): item is [string, string] => Boolean(item)),
  )
  return {
    name: meta.name || 'Untitled Skill',
    description: meta.description || '',
    body: match[2] || '',
  }
}

export function isTextFile(path: string, content: string) {
  if (BINARY_EXT_RE.test(path))
    return false
  return !content.includes('\u0000')
}

export function createSkillMarkdown(name: string, description = '') {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n${description}\n`
}

export interface SkillTextFile {
  path: string
  content: string
}

export function normalizeSkillPath(path: string) {
  return path.replace(BACKSLASH_RE, '/').replace(LEADING_SLASHES_RE, '').trim()
}

export function normalizeSkillFiles(files: SkillTextFile[]) {
  return files
    .map(file => ({
      path: normalizeSkillPath(file.path),
      content: file.content,
    }))
    .filter(file => file.path && !file.path.endsWith('/'))
}

export function parseZipTextFiles(buffer: Buffer) {
  const files: SkillTextFile[] = []
  let eocdOffset = -1
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054B50) {
      eocdOffset = offset
      break
    }
  }
  if (eocdOffset < 0)
    throw new Error('Invalid ZIP file')

  const entries = buffer.readUInt16LE(eocdOffset + 10)
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16)

  for (let index = 0; index < entries; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014B50)
      throw new Error('Invalid ZIP central directory')

    const method = buffer.readUInt16LE(centralOffset + 10)
    const compressedSize = buffer.readUInt32LE(centralOffset + 20)
    const fileNameLength = buffer.readUInt16LE(centralOffset + 28)
    const extraLength = buffer.readUInt16LE(centralOffset + 30)
    const commentLength = buffer.readUInt16LE(centralOffset + 32)
    const localOffset = buffer.readUInt32LE(centralOffset + 42)
    const fileName = normalizeSkillPath(
      buffer.subarray(centralOffset + 46, centralOffset + 46 + fileNameLength).toString('utf8'),
    )

    centralOffset += 46 + fileNameLength + extraLength + commentLength
    if (!fileName || fileName.endsWith('/'))
      continue
    if (buffer.readUInt32LE(localOffset) !== 0x04034B50)
      throw new Error('Invalid ZIP local header')

    const localNameLength = buffer.readUInt16LE(localOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize)
    const data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null
    if (!data)
      throw new Error(`Unsupported ZIP compression method: ${method}`)

    const content = data.toString('utf8')
    if (!isTextFile(fileName, content))
      throw new Error(`Binary file is not allowed: ${fileName}`)
    files.push({ path: fileName, content })
  }

  return normalizeSkillFiles(files)
}
