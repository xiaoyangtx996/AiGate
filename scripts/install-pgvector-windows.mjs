/**
 * Install pgvector extension binaries for PostgreSQL on Windows (dev helper).
 * Uses unofficial prebuilt binaries from pgvector_pgsql_windows when MSVC/nmake is unavailable.
 *
 * Usage:
 *   set PGROOT=D:\develop\Infra\PostgreSQL\14.15
 *   node scripts/install-pgvector-windows.mjs
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, copyFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { execFileSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const releaseTag = process.env.PGVECTOR_RELEASE_TAG || '0.8.2_14.20'
const assetName = process.env.PGVECTOR_ASSET_NAME || 'vector.v0.8.2-pg14.zip'
const downloadUrl = process.env.PGVECTOR_DOWNLOAD_URL
  || `https://github.com/andreiramani/pgvector_pgsql_windows/releases/download/${releaseTag}/${assetName}`

function resolvePgRoot() {
  if (process.env.PGROOT)
    return process.env.PGROOT

  try {
    const pgConfig = execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim()
    return dirname(pgConfig)
  }
  catch {
    return null
  }
}

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name)
    const to = join(dest, entry.name)
    if (entry.isDirectory())
      copyDir(from, to)
    else
      copyFileSync(from, to)
  }
}

const pgRoot = resolvePgRoot()
if (!pgRoot) {
  console.error('Set PGROOT to your PostgreSQL installation directory (contains lib/ and share/).')
  process.exit(1)
}

const cacheDir = join(__dirname, '../.cache/pgvector')
const zipPath = join(cacheDir, assetName)
const extractDir = join(cacheDir, 'extracted')

mkdirSync(cacheDir, { recursive: true })

if (!existsSync(zipPath)) {
  console.log(`Downloading ${downloadUrl}`)
  const response = await fetch(downloadUrl)
  if (!response.ok) {
    console.error(`Download failed: ${response.status} ${response.statusText}`)
    process.exit(1)
  }
  await pipeline(response.body, createWriteStream(zipPath))
}

if (existsSync(extractDir))
  rmSync(extractDir, { recursive: true, force: true })

try {
  execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`], { stdio: 'inherit' })
}
catch (err) {
  console.error('Failed to extract archive:', err.message)
  process.exit(1)
}

const payloadRoot = existsSync(join(extractDir, 'lib')) ? extractDir : join(extractDir, readdirSync(extractDir)[0])
copyFileSync(join(payloadRoot, 'lib/vector.dll'), join(pgRoot, 'lib/vector.dll'))
copyDir(join(payloadRoot, 'share/extension'), join(pgRoot, 'share/extension'))
if (existsSync(join(payloadRoot, 'include/server/extension/vector')))
  copyDir(join(payloadRoot, 'include/server/extension/vector'), join(pgRoot, 'include/server/extension/vector'))

console.log(`pgvector binaries installed into ${pgRoot}`)
console.log('Next: pnpm db:migrate  (applies 0027_pgvector_embedding.sql)')
