import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '../app/db/migrations')
const journalPath = join(migrationsDir, 'meta/_journal.json')
const applyAllPath = join(__dirname, 'apply-all-migrations.mjs')
const migrationSqlFileRegex = /^\d{4}_.+\.sql$/
const supplementalFileRegex = /file:\s*'([^']+\.sql)'/g
const sqlExtensionRegex = /\.sql$/

const journal = JSON.parse(readFileSync(journalPath, 'utf8'))
const journalTags = new Set(journal.entries.map(entry => entry.tag))
const sqlFiles = readdirSync(migrationsDir)
  .filter(file => migrationSqlFileRegex.test(file))
  .sort()

const applyAllSource = readFileSync(applyAllPath, 'utf8')
const supplementalFiles = new Set(
  Array.from(applyAllSource.matchAll(supplementalFileRegex), match => match[1]),
)

const missingSqlFiles = Array.from(journalTags, tag => `${tag}.sql`)
  .filter(file => !sqlFiles.includes(file))

const uncoveredSqlFiles = sqlFiles.filter((file) => {
  const tag = file.replace(sqlExtensionRegex, '')
  return !journalTags.has(tag) && !supplementalFiles.has(file)
})

const missingSupplementalFiles = [...supplementalFiles]
  .filter(file => !sqlFiles.includes(file))

if (missingSqlFiles.length || uncoveredSqlFiles.length || missingSupplementalFiles.length) {
  if (missingSqlFiles.length) {
    console.error('Journal entries without SQL files:', missingSqlFiles.join(', '))
  }
  if (uncoveredSqlFiles.length) {
    console.error('SQL files are neither journaled nor supplemental:', uncoveredSqlFiles.join(', '))
  }
  if (missingSupplementalFiles.length) {
    console.error('Supplemental files referenced by apply-all-migrations.mjs are missing:', missingSupplementalFiles.join(', '))
  }
  process.exit(1)
}

const unjournaledSupplementalFiles = sqlFiles.filter((file) => {
  const tag = file.replace(sqlExtensionRegex, '')
  return !journalTags.has(tag) && supplementalFiles.has(file)
})

console.log('Migration consistency OK.')
console.log(`Journaled migrations: ${journalTags.size}`)
console.log(`SQL files: ${sqlFiles.length}`)
console.log(`Supplemental unjournaled SQL: ${unjournaledSupplementalFiles.join(', ') || 'none'}`)
