import { isAbsolute, relative, resolve, sep } from 'node:path'

import { withImportDestination } from './import-paths'
import { clearClaudeCredentials } from './providers/claude-profile'

export function importNativeLocation(cwd: string, home: string, path: string) {
  const location = relative(resolve(cwd), resolve(home))
  const inside =
    location !== '..' &&
    !location.startsWith(`..${sep}`) &&
    !isAbsolute(location)
  return inside
    ? {
        root: cwd,
        path: location ? `${location.split(sep).join('/')}/${path}` : path,
      }
    : { root: home, path }
}

export async function clearImportedCredentials(cwd: string, home: string) {
  const destination = importNativeLocation(
    cwd,
    home,
    '.conductive/anthropic/credentials/.import-check',
  )
  if (destination.root === cwd)
    await withImportDestination(
      destination.root,
      destination.path,
      async () => undefined,
    )
  await clearClaudeCredentials(home)
}
