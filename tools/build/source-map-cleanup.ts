import { glob, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

export async function removeSourceMaps(
  directory: string,
  warn: (message: string) => void,
): Promise<void> {
  try {
    for await (const file of glob('**/*.map', { cwd: directory })) {
      await rm(resolve(directory, file), { force: true })
    }
  } catch {
    warn(
      'Error-reporting source maps could not all be removed. The deployment map exclusions remain in force.',
    )
  }
}
