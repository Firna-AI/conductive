import { createReadStream } from 'node:fs'
import { lstat, mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import type { ImportManifestEntry } from '../../../src/shared/conductor-import-manifest.ts'
import {
  readImportManifestEntry,
  readImportPart,
} from '../../../src/shared/conductor-import-manifest-read.ts'
import { IMPORT_PART_BYTES } from '../../../src/shared/conductor-import-pages.ts'
import type { ImportPart } from '../../../src/shared/conductor-import-storage.ts'
import { fileIdentity, readSourceFile } from './safe-files.ts'
import { readStageBuild, readStageSource } from './stage-read.ts'
import {
  generatedId,
  readState,
  stageDirectory,
  stageRoot,
} from './stage-state.ts'
import type { ImportLocations } from './types.ts'
import { LocalImportError } from './types.ts'

export async function loadBuild(locations: ImportLocations, id: string) {
  const directory = stageDirectory(locations, id)
  const build = readStageBuild(await readState(join(directory, 'current.json')))
  if (build.stage.id !== id) throw new LocalImportError('read_failed')
  return { directory, build, output: join(directory, build.directory) }
}

export async function stagePage(
  locations: ImportLocations,
  id: string,
  offset: number,
  signal: AbortSignal,
): Promise<ImportManifestEntry[]> {
  signal.throwIfAborted()
  const { build, output } = await loadBuild(locations, id)
  if (!build.sealed || offset > build.stage.snapshot.recordCount)
    throw new LocalImportError('read_failed')
  const stream = createReadStream(join(output, 'sealed.ndjson'), { signal })
  const lines = createInterface({ input: stream, crlfDelay: Infinity })
  const entries: ImportManifestEntry[] = []
  let index = 0
  try {
    for await (const line of lines) {
      signal.throwIfAborted()
      if (index++ < offset) continue
      const value: unknown = JSON.parse(line)
      entries.push(readImportManifestEntry(value))
      if (entries.length === 256) break
    }
  } finally {
    lines.close()
    stream.destroy()
  }
  return entries
}

export async function stagePart(
  locations: ImportLocations,
  id: string,
  requested: ImportPart,
  signal: AbortSignal,
): Promise<Uint8Array<ArrayBuffer>> {
  signal.throwIfAborted()
  const { build, output } = await loadBuild(locations, id)
  if (!build.sealed) throw new LocalImportError('read_failed')
  const part = readImportPart(requested)
  generatedId(part.id)
  if (part.sizeBytes > IMPORT_PART_BYTES)
    throw new LocalImportError('read_failed')
  const membership = readImportManifestEntry(
    await readState(join(output, 'membership', part.id)),
  )
  if (
    membership.kind !== 'part' ||
    membership.part.id !== part.id ||
    membership.part.group !== part.group ||
    membership.part.sha256 !== part.sha256 ||
    membership.part.sizeBytes !== part.sizeBytes
  )
    throw new LocalImportError('read_failed')
  const source = join(output, 'parts', part.id)
  const stat = await lstat(source, { bigint: true })
  if (!stat.isFile() || stat.size !== BigInt(part.sizeBytes))
    throw new LocalImportError('read_failed')
  const temporary = await mkdtemp(join(stageRoot(locations), 'read-'))
  try {
    const path = join(temporary, 'bytes')
    const copied = await readSourceFile(
      source,
      signal,
      path,
      fileIdentity(stat),
    )
    if (copied.size !== part.sizeBytes || copied.hash !== part.sha256)
      throw new LocalImportError('read_failed')
    signal.throwIfAborted()
    return new Uint8Array(await readFile(path, { signal }))
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

export async function stageResults(locations: ImportLocations, id: string) {
  const { build } = await loadBuild(locations, id)
  const source = readStageSource(
    await readState(join(stageDirectory(locations, id), 'source.json')),
  ).source
  return {
    files: build.omittedFiles,
    sessions: source.native
      .filter(
        (memory) =>
          !memory.path || !memory.session.agent || !memory.session.nativeId,
      )
      .map((memory) => ({ title: memory.session.title })),
  }
}
