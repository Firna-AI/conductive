import {
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  rename,
  rm,
  unlink,
} from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'

import type { ImportSnapshot } from '../../src/shared/conductor-import-manifest'
import { importGit } from './import-git'
import { importTreeEntries } from './import-git-tree'
import { withImportDestination } from './import-paths'
import { ImportStorage, readImportJson, saveImportJson } from './import-storage'
import { boolean, object, string } from './parse'

const rawAttributes = '* -text -eol -filter -working-tree-encoding -ident\n'

async function syncDirectory(path: string) {
  const file = await open(path, 'r')
  try {
    await file.sync()
  } finally {
    await file.close()
  }
}

async function existing(path: string) {
  return lstat(path, { bigint: true }).catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return null
    throw error
  })
}

async function restoreAttributes(storage: ImportStorage, target: string) {
  const journal = storage.path('checkout', 'attributes')
  const value = await readImportJson(journal)
  if (!value) return
  const saved = object(value)
  const directory = string(saved.directory)
  if (
    saved.target !== target ||
    dirname(directory) !== dirname(target) ||
    !basename(directory).startsWith('.conductive-attributes-')
  )
    throw new Error('The import attributes journal does not match.')
  const original = boolean(saved.original)
  const backup = join(directory, 'original')
  const [current, owned, previous] = await Promise.all([
    existing(target),
    existing(join(directory, 'override')),
    existing(backup),
  ])
  if (
    current &&
    owned &&
    current.ino === owned.ino &&
    current.dev === owned.dev
  )
    await unlink(target)
  if (previous) {
    if (await existing(target))
      throw new Error('The import attributes destination changed.')
    await rename(backup, target)
  } else if (original && !(await existing(target)))
    throw new Error('The original import attributes are missing.')
  await syncDirectory(dirname(target))
  await rm(directory, { recursive: true, force: true })
  await syncDirectory(dirname(target))
  await saveImportJson(journal, null)
}

/** The owned override is recovered before replay and restored before Git is marked applied. */
export async function checkoutImport(
  storage: ImportStorage,
  cwd: string,
  activationId: string,
  snapshot: ImportSnapshot,
  signal: AbortSignal,
) {
  const target = resolve(
    cwd,
    await importGit(cwd, activationId, signal, [
      'rev-parse',
      '--git-path',
      'info/attributes',
    ]),
  )
  await mkdir(dirname(target), { recursive: true })
  await restoreAttributes(storage, target)
  const directory = await mkdtemp(
    join(dirname(target), '.conductive-attributes-'),
  )
  const override = join(directory, 'override')
  const file = await open(override, 'wx', 0o600)
  try {
    await file.writeFile(rawAttributes)
    await file.sync()
  } finally {
    await file.close()
  }
  await syncDirectory(directory)
  await syncDirectory(dirname(target))
  const original = Boolean(await existing(target))
  await saveImportJson(storage.path('checkout', 'attributes'), {
    target,
    directory,
    original,
  })
  try {
    if (original) await rename(target, join(directory, 'original'))
    await link(override, target)
    await syncDirectory(directory)
    await syncDirectory(dirname(target))
    await importGit(cwd, activationId, signal, [
      '-c',
      'core.symlinks=true',
      'checkout',
      '--force',
      '-B',
      snapshot.branch,
      snapshot.headOid,
    ])
    for await (const entry of importTreeEntries(cwd, snapshot.headOid, signal))
      if (['100644', '100755', '120000'].includes(entry.mode))
        await withImportDestination(cwd, entry.path, (path) =>
          unlink(path).catch((error: unknown) => {
            if (
              error instanceof Error &&
              'code' in error &&
              error.code === 'ENOENT'
            )
              return
            throw error
          }),
        )
    await importGit(cwd, activationId, signal, [
      '-c',
      'core.symlinks=true',
      'checkout-index',
      '--all',
      '--force',
    ])
  } finally {
    await restoreAttributes(storage, target)
  }
}
