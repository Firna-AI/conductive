import { createHash } from 'node:crypto'
import { chmod, mkdir, mkdtemp, open, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface ClaudeProfile {
  directory: string
  name: string
  remove(): Promise<void>
}

export async function writeClaudeProfile(
  home: string,
  sessionId: string,
  endpoint: string,
  token: string,
): Promise<ClaudeProfile> {
  const root = join(home, '.conductive', 'anthropic')
  await privateDirectory(root)
  // Older runners remove abandoned process folders here after rollback.
  const processes = join(root, 'credentials')
  await privateDirectory(processes)
  const directory = await mkdtemp(join(processes, 'process-'))
  const name = `session-${createHash('sha256').update(sessionId).digest('hex')}`
  const configs = join(directory, 'configs')
  const credentials = join(directory, 'credentials')
  const credential = join(credentials, `${name}.json`)
  const remove = () => rm(directory, { recursive: true, force: true })
  try {
    await privateDirectory(directory)
    await privateDirectory(configs)
    await privateDirectory(credentials)
    await writeFile(
      join(configs, `${name}.json`),
      JSON.stringify({
        base_url: endpoint,
        authentication: { type: 'user_oauth' },
      }),
    )
    const file = await open(credential, 'w', 0o600)
    try {
      await file.chmod(0o600)
      await file.writeFile(JSON.stringify({ access_token: token }))
    } finally {
      await file.close()
    }
  } catch (error) {
    await remove()
    throw error
  }
  return { directory, name, remove }
}

async function privateDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true, mode: 0o700 })
  await chmod(path, 0o700)
}
