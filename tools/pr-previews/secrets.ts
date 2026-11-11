import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SECRET_NAMES, type PreviewSecrets } from './settings.ts'

export async function writeSecretsFile(
  secrets: PreviewSecrets,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<{ path: string; cleanup(): Promise<void> }> {
  const directory = await mkdtemp(
    join(environment.RUNNER_TEMP || tmpdir(), 'conductive-preview-'),
  )
  const path = join(directory, 'secrets.json')
  const cleanup = () => rm(directory, { recursive: true, force: true })
  const values = Object.fromEntries(
    SECRET_NAMES.map((name) => [name, secrets[name]]),
  )
  try {
    await writeFile(path, JSON.stringify(values), {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    })
  } catch {
    await cleanup()
    throw new Error('Could not write the preview secrets file.')
  }
  return { path, cleanup }
}
