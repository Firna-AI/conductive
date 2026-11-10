import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

/** The same package version and short commit for both app renderer builds. */
export function buildVersion(): string {
  const manifest: unknown = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
  )
  const version =
    typeof manifest === 'object' &&
    manifest !== null &&
    'version' in manifest &&
    typeof manifest.version === 'string'
      ? manifest.version
      : 'development'
  let commit = 'development'
  try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    // Source archives have no Git checkout. Their version stays available.
  }
  return `${version} (${commit})`
}
