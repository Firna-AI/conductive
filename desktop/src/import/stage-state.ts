import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import {
  chmod,
  mkdir,
  open,
  readdir,
  rename,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import type { ImportRepositoryFacts } from '../../../src/shared/conductor-import-operation.ts'
import type { ImportLocations, ImportStage, SourceInventory } from './types.ts'
import { LocalImportError } from './types.ts'
import { digest } from './safe-files.ts'

export interface StageSource {
  id: string
  scope: string
  reservationId: string
  source: SourceInventory
}

export interface StageBuild {
  directory: string
  sealed: boolean
  facts: ImportRepositoryFacts
  exclusions: string[]
  omittedFiles: { path: string; sizeBytes: number }[]
  stage: ImportStage
}

export const stageRoot = (locations: ImportLocations) =>
  join(locations.userData, 'conductor-import')

export function generatedId(id: string): string {
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id))
    throw new LocalImportError('read_failed')
  return id
}

export const stageDirectory = (locations: ImportLocations, id: string) =>
  join(stageRoot(locations), generatedId(id))

export const stageBinding = (
  locations: ImportLocations,
  scope: string,
  localWorkspaceId: string,
  reservationId: string,
) =>
  join(
    stageRoot(locations),
    'bindings',
    digest([scope, localWorkspaceId, reservationId]),
  )

export async function privateDirectory(path: string) {
  await mkdir(path, { recursive: true, mode: 0o700 })
  await chmod(path, 0o700)
  return path
}

export async function privateTree(path: string) {
  await chmod(path, 0o700)
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name)
    if (entry.isDirectory()) await privateTree(child)
    else await chmod(child, 0o600)
  }
}

export async function writeState(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}`
  await writeFile(temporary, JSON.stringify(value), { flag: 'wx', mode: 0o600 })
  await rename(temporary, path)
}

export async function readState(path: string): Promise<unknown> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    if (!(await file.stat()).isFile()) throw new LocalImportError('read_failed')
    return JSON.parse(await file.readFile('utf8'))
  } finally {
    await file.close()
  }
}

export const capturedFile = (directory: string, index: number) =>
  join(directory, 'files', String(index))

export const capturedNative = (
  directory: string,
  index: number,
  path: string,
) =>
  join(
    directory,
    'native',
    `${index}${path.endsWith('.zst') ? '.jsonl.zst' : '.jsonl'}`,
  )
