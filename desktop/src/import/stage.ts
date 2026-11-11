import { randomUUID } from 'node:crypto'
import { copyFile, open } from 'node:fs/promises'
import { join } from 'node:path'
import type { ImportRepositoryFacts } from '../../../src/shared/conductor-import-operation.ts'
import type { ImportLfsObject } from '../../../src/shared/conductor-import-lfs.ts'
import type { ImportPart } from '../../../src/shared/conductor-import-storage.ts'
import type { ImportPrerequisite } from '../../../src/shared/conductor-import-manifest.ts'
import { readImportManifestEntry } from '../../../src/shared/conductor-import-manifest-read.ts'
import {
  importInteger,
  importObject,
  importText,
} from '../../../src/shared/conductor-import-values.ts'
import { captureSource, currentSource } from './stage-capture.ts'
import { packageStage } from './package.ts'
import { missing } from './safe-files.ts'
import { reusableInventory } from './stage-reuse.ts'
import {
  prepareLfsCandidates,
  recordLfsPage,
  stageLfsPage,
} from './stage-lfs.ts'
import {
  readStageBuild,
  readStageFacts,
  readStageSource,
} from './stage-read.ts'
import {
  privateDirectory,
  privateTree,
  readState,
  stageBinding,
  stageDirectory,
  stageRoot,
  writeState,
} from './stage-state.ts'
import type { ImportStage } from './types.ts'
import type { ImportLocations } from './locations.ts'
import { LocalImportError } from './types.ts'
import {
  loadBuild,
  stagePage,
  stagePart,
  stageResults,
} from './stage-content.ts'

export async function prepareStage(
  locations: ImportLocations,
  localWorkspaceId: string,
  scope: string,
  reservationId: string,
  signal: AbortSignal,
) {
  importText(scope)
  importText(reservationId)
  const source = await currentSource(locations, localWorkspaceId, signal)
  await privateDirectory(stageRoot(locations))
  const id = randomUUID()
  const directory = await privateDirectory(stageDirectory(locations, id))
  await captureSource(locations, directory, source, signal)
  await prepareLfsCandidates(directory, source, signal)
  await writeState(join(directory, 'source.json'), {
    id,
    scope,
    reservationId,
    source,
  })
  return { id, row: { ...source.workspace.row, branch: source.branch } }
}

export async function buildStage(
  locations: ImportLocations,
  stageId: string,
  facts: ImportRepositoryFacts,
  exclusions: string[] | undefined,
  signal: AbortSignal,
): Promise<ImportStage> {
  const directory = stageDirectory(locations, stageId)
  const prepared = readStageSource(
    await readState(join(directory, 'source.json')),
  )
  const current = await readState(join(directory, 'current.json')).catch(
    (error: unknown) => {
      if (missing(error)) return null
      throw error
    },
  )
  if (current !== null && readStageBuild(current).sealed)
    throw new LocalImportError('read_failed')
  const id = randomUUID()
  const output = await privateDirectory(join(directory, id))
  const capturedFacts = readStageFacts(facts)
  const built = await packageStage(
    locations,
    directory,
    output,
    prepared,
    capturedFacts,
    exclusions,
    signal,
  )
  await privateTree(output)
  await writeState(join(directory, 'current.json'), {
    directory: id,
    sealed: false,
    facts: capturedFacts,
    ...built,
  })
  return built.stage
}

export async function sealStage(
  locations: ImportLocations,
  stageId: string,
  prerequisites: ImportPrerequisite[],
  signal: AbortSignal,
): Promise<ImportStage> {
  signal.throwIfAborted()
  const { directory, build, output } = await loadBuild(locations, stageId)
  const verified = new Map(
    prerequisites.map((value) => {
      const entry = readImportManifestEntry(value)
      if (entry.kind !== 'prerequisite')
        throw new LocalImportError('read_failed')
      return [entry.oid, entry] as const
    }),
  )
  if (
    verified.size !== prerequisites.length ||
    JSON.stringify([...verified.keys()].sort()) !==
      JSON.stringify(build.stage.candidates)
  )
    throw new LocalImportError('read_failed')
  if (build.sealed) return build.stage
  const manifest = join(output, 'sealed.ndjson')
  await copyFile(join(output, 'manifest.ndjson'), manifest)
  const file = await open(manifest, 'a', 0o600)
  try {
    for (const oid of build.stage.candidates) {
      signal.throwIfAborted()
      const prerequisite = verified.get(oid)
      if (!prerequisite) throw new LocalImportError('read_failed')
      await file.writeFile(`${JSON.stringify(prerequisite)}\n`)
    }
  } finally {
    await file.close()
  }
  const source = readStageSource(
    await readState(join(directory, 'source.json')),
  )
  await writeState(join(directory, 'current.json'), { ...build, sealed: true })
  await privateDirectory(join(stageRoot(locations), 'bindings'))
  await writeState(
    stageBinding(
      locations,
      source.scope,
      source.source.workspace.row.localWorkspaceId,
      source.reservationId,
    ),
    { stageId },
  )
  return build.stage
}

export async function reuseStage(
  locations: ImportLocations,
  localWorkspaceId: string,
  scope: string,
  reservationId: string,
  signal: AbortSignal,
): Promise<ImportStage | null> {
  try {
    const binding = importObject(
      await readState(
        stageBinding(locations, scope, localWorkspaceId, reservationId),
      ),
    )
    const { directory, build, output } = await loadBuild(
      locations,
      importText(binding.stageId),
    )
    const source = readStageSource(
      await readState(join(directory, 'source.json')),
    )
    if (
      !build.sealed ||
      source.scope !== scope ||
      source.reservationId !== reservationId ||
      source.source.workspace.row.localWorkspaceId !== localWorkspaceId
    )
      return null
    const fresh = await currentSource(locations, localWorkspaceId, signal)
    if (fresh.digest !== source.source.digest) return null
    return (await reusableInventory(output, source, build, signal))
      ? build.stage
      : null
  } catch {
    signal.throwIfAborted()
    return null
  }
}

export async function readStagePage(
  locations: ImportLocations,
  stageId: string,
  offset: number,
  signal: AbortSignal,
) {
  return stagePage(locations, stageId, importInteger(offset), signal)
}

export async function readStagePart(
  locations: ImportLocations,
  stageId: string,
  part: ImportPart,
  signal: AbortSignal,
) {
  return stagePart(locations, stageId, part, signal)
}

export async function readStageResults(
  locations: ImportLocations,
  stageId: string,
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  return stageResults(locations, stageId)
}

export async function readStageLfsPage(
  locations: ImportLocations,
  stageId: string,
  offset: number,
  signal: AbortSignal,
) {
  return stageLfsPage(locations, stageId, offset, signal)
}

export async function recordStageLfsPage(
  locations: ImportLocations,
  stageId: string,
  factsId: string,
  page: number,
  available: ImportLfsObject[],
  signal: AbortSignal,
) {
  return recordLfsPage(locations, stageId, factsId, page, available, signal)
}
