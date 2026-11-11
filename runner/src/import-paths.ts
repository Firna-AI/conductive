import { constants } from 'node:fs'
import { createReadStream } from 'node:fs'
import { randomUUID } from 'node:crypto'
import {
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  rm,
  symlink,
  chmod,
  type FileHandle,
} from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

import { importPath } from '../../src/shared/conductor-import-values.ts'

/** Keep an opened parent directory throughout a mutation. Never follow imported links. */
export async function withImportDestination<T>(
  root: string,
  path: string,
  work: (destination: string) => Promise<T>,
): Promise<T> {
  importPath(path)
  const base = await realpath(root)
  let parent: FileHandle = await open(
    base,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
  )
  const pieces = path.split('/')
  try {
    for (const name of pieces.slice(0, -1)) {
      const path = `/proc/self/fd/${parent.fd}/${name}`
      try {
        await mkdir(path, { mode: 0o700 })
      } catch (error) {
        if (!(
          error instanceof Error &&
          'code' in error &&
          error.code === 'EEXIST'
        ))
          throw error
      }
      const next = await open(
        path,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
      )
      await parent.close()
      parent = next
    }
    const actual = await realpath(`/proc/self/fd/${parent.fd}`)
    const inside = relative(base, actual)
    if (
      isAbsolute(inside) ||
      inside === '..' ||
      inside.startsWith(`..${sep}`) ||
      inside.split(sep).some((part) => /^\.git$/i.test(part))
    )
      throw new Error('The import destination left the repository.')
    return await work(`/proc/self/fd/${parent.fd}/${pieces.at(-1)}`)
  } finally {
    await parent.close()
  }
}

export async function replaceImportFile(
  root: string,
  path: string,
  source: string,
  mode: number,
) {
  await withImportDestination(root, path, async (destination) => {
    const temporary = join(
      dirname(destination),
      `.conductive-import-${randomUUID()}`,
    )
    const file = await open(
      temporary,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      mode,
    )
    let renamed = false
    try {
      for await (const bytes of createReadStream(source))
        await file.writeFile(bytes)
      await file.chmod(mode)
      await file.sync()
      const existing = await lstat(destination).catch((error: unknown) => {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        )
          return null
        throw error
      })
      if (existing?.isDirectory()) await rm(destination, { recursive: true })
      await rename(temporary, destination)
      renamed = true
    } finally {
      await file.close()
      if (!renamed) await rm(temporary, { force: true })
    }
    const parent = await open(dirname(destination), 'r')
    try {
      await parent.sync()
    } finally {
      await parent.close()
    }
  })
}

export async function restoreImportDirectory(
  root: string,
  path: string,
  mode: number,
) {
  await withImportDestination(root, path, async (destination) => {
    const info = await lstat(destination).catch(() => null)
    if (info && !info.isDirectory()) await rm(destination, { recursive: true })
    await mkdir(destination, { recursive: true, mode })
    await setDirectoryMode(destination, mode)
  })
}

/** Linux O_PATH keeps even mode-000 directories pinned without following a link. */
async function setDirectoryMode(path: string, mode: number) {
  const directory = await open(
    path,
    0x200000 | constants.O_DIRECTORY | constants.O_NOFOLLOW,
  )
  try {
    await chmod(`/proc/self/fd/${directory.fd}`, mode)
  } finally {
    await directory.close()
  }
}

export function restoreImportDirectoryMode(
  root: string,
  path: string,
  mode: number,
) {
  return withImportDestination(root, path, (destination) =>
    setDirectoryMode(destination, mode),
  )
}

export async function restoreImportLink(
  root: string,
  path: string,
  target: string,
) {
  await withImportDestination(root, path, async (destination) => {
    await rm(destination, { force: true, recursive: true })
    await symlink(target, destination)
  })
}

export const importPendingPath = (home: string) =>
  join(resolve(home), '.conductive', 'import-pending')
