import { mkdtemp, readFile, rmdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export interface InstallLocationDependencies {
  packaged: boolean
  enabled: boolean
  platform: string
  version: string
  executable: string
  userData: string
  inApplications(): boolean
  choose(): Promise<'move' | 'not-now'>
  move(): boolean
  warn(error: unknown): void
}

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  )
}

async function isReadOnlyLocation(parent: string): Promise<boolean> {
  let probe: string
  try {
    probe = await mkdtemp(resolve(parent, '.conductive-update-probe-'))
  } catch (error) {
    if (hasCode(error, 'EROFS')) return true
    throw error
  }
  await rmdir(probe)
  return false
}

export async function offerApplicationsMove(
  dependencies: InstallLocationDependencies,
): Promise<void> {
  try {
    if (
      !dependencies.packaged ||
      !dependencies.enabled ||
      dependencies.platform !== 'darwin' ||
      dependencies.inApplications()
    )
      return
    const dismissal = resolve(
      dependencies.userData,
      'install-location-dismissed-version',
    )
    try {
      if ((await readFile(dismissal, 'utf8')) === dependencies.version) return
    } catch (error) {
      if (!hasCode(error, 'ENOENT')) throw error
    }
    const bundleParent = resolve(dirname(dependencies.executable), '../../..')
    if (!(await isReadOnlyLocation(bundleParent))) return
    if ((await dependencies.choose()) === 'move') dependencies.move()
    else await writeFile(dismissal, dependencies.version, { mode: 0o600 })
  } catch (error) {
    dependencies.warn(error)
  }
}
