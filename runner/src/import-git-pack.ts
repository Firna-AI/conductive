import { link, mkdir, readdir, unlink, writeFile, open } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import type { ImportSnapshot } from '../../src/shared/conductor-import-manifest'
import { importGit } from './import-git'
import { ImportStorage } from './import-storage'
import { completedPackFacts, indexImportBundle } from './import-git-pack-facts'

export async function restoreImportBundle(
  storage: ImportStorage,
  cwd: string,
  activationId: string,
  snapshot: ImportSnapshot,
  bundle: string,
  signal: AbortSignal,
) {
  const git = (directory: string, args: string[]) =>
    importGit(directory, activationId, signal, args)
  const quarantine = join(storage.directory, 'git-quarantine')
  await mkdir(quarantine, { recursive: true, mode: 0o700 })
  await git(quarantine, [
    'init',
    '--bare',
    `--object-format=${snapshot.objectFormat}`,
  ])
  const objects = resolve(
    cwd,
    await git(cwd, ['rev-parse', '--git-path', 'objects']),
  )
  await mkdir(join(quarantine, 'objects', 'info'), { recursive: true })
  await writeFile(
    join(quarantine, 'objects', 'info', 'alternates'),
    `${objects}\n`,
    { mode: 0o600 },
  )
  await importGit(
    cwd,
    activationId,
    signal,
    ['bundle', 'verify', bundle],
    false,
  )
  await indexImportBundle(quarantine, bundle, signal)
  const packs = (await readdir(join(quarantine, 'objects', 'pack'))).filter(
    (name) => name.endsWith('.idx'),
  )
  const { count, inflated, largest } = await completedPackFacts(
    quarantine,
    packs.map((name) => join(quarantine, 'objects', 'pack', name)),
    signal,
  )
  const facts = snapshot.gitDisk.reconstruction
  if (
    count !== BigInt(facts.objectCount) ||
    inflated !== BigInt(facts.inflatedBytes) ||
    largest !== BigInt(facts.maxObjectBytes)
  )
    throw new Error('The reconstructed Git object facts do not match.')
  const packDirectory = join(objects, 'pack')
  await mkdir(packDirectory, { recursive: true })
  for (const name of await readdir(join(quarantine, 'objects', 'pack'))) {
    const source = join(quarantine, 'objects', 'pack', name)
    const destination = join(packDirectory, name)
    try {
      await link(source, destination)
    } catch (error) {
      if (
        !(
          error instanceof Error &&
          'code' in error &&
          error.code === 'EEXIST'
        ) ||
        (await storage.hash(source)) !== (await storage.hash(destination))
      )
        throw error
    }
    await unlink(source)
    const file = await open(destination, 'r')
    try {
      await file.sync()
    } finally {
      await file.close()
    }
  }
  const directory = await open(packDirectory, 'r')
  try {
    await directory.sync()
  } finally {
    await directory.close()
  }
}
