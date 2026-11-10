import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { readImportManifestEntry } from '../../../src/shared/conductor-import-manifest-read.ts'
import { IMPORT_PART_BYTES } from '../../../src/shared/conductor-import-pages.ts'
import { digest, readSourceFile } from './safe-files.ts'
import { generatedId, readState } from './stage-state.ts'
import type { StageBuild, StageSource } from './stage-state.ts'

/** Retry keeps one exact inventory, including its local sealed part bytes. */
export async function reusableInventory(
  output: string,
  source: StageSource,
  build: StageBuild,
  signal: AbortSignal,
) {
  const inventory = createHash('sha256')
  const totals = {
    records: 0,
    objects: 0,
    parts: 0,
    sessions: 0,
    stored: 0,
    restored: 0,
  }
  const candidates: string[] = []
  const stream = createReadStream(join(output, 'sealed.ndjson'), { signal })
  const lines = createInterface({ input: stream, crlfDelay: Infinity })
  try {
    for await (const line of lines) {
      signal.throwIfAborted()
      const value: unknown = JSON.parse(line)
      const entry = readImportManifestEntry(value)
      totals.records++
      if (entry.kind === 'prerequisite') candidates.push(entry.oid)
      else inventory.update(`${JSON.stringify(entry)}\n`)
      if (entry.kind === 'object') {
        totals.objects++
        totals.stored += entry.sizeBytes
        totals.restored += entry.restoredBytes
      } else if (entry.kind === 'session') totals.sessions++
      else if (entry.kind === 'part') {
        totals.parts++
        const partId = generatedId(entry.part.id)
        const path = join(output, 'parts', partId)
        if (
          entry.part.sizeBytes > IMPORT_PART_BYTES ||
          (await lstat(path)).size !== entry.part.sizeBytes
        )
          return false
        const membership = readImportManifestEntry(
          await readState(join(output, 'membership', partId)),
        )
        if (JSON.stringify(membership) !== JSON.stringify(entry)) return false
        const bytes = await readSourceFile(path, signal)
        if (
          bytes.size !== entry.part.sizeBytes ||
          bytes.hash !== entry.part.sha256
        )
          return false
      }
    }
  } finally {
    lines.close()
    stream.destroy()
  }
  const snapshot = build.stage.snapshot
  return (
    JSON.stringify(candidates.sort()) ===
      JSON.stringify(build.stage.candidates) &&
    totals.records === snapshot.recordCount &&
    totals.objects === snapshot.objectCount &&
    totals.parts === snapshot.partCount &&
    totals.sessions === snapshot.sessionCount &&
    totals.stored === snapshot.storedBytes &&
    totals.restored === snapshot.restoredBytes &&
    digest({
      sourceDigest: source.source.digest,
      gitDisk: snapshot.gitDisk,
      exclusions: build.exclusions,
      candidates: build.stage.candidates,
      inventory: inventory.digest('hex'),
    }) === snapshot.sourceFingerprint
  )
}
