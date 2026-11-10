import { createHash, randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { open, writeFile } from 'node:fs/promises'
import type { FileHandle } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  ImportContentObject,
  ImportManifestEntry,
  ImportObjectPart,
} from '../../../src/shared/conductor-import-manifest.ts'
import { IMPORT_PART_BYTES } from '../../../src/shared/conductor-import-pages.ts'
import { readImportManifestEntry } from '../../../src/shared/conductor-import-manifest-read.ts'
import { privateDirectory } from './stage-state.ts'
import { LocalImportError } from './types.ts'

export class PackageObjects {
  readonly totals = {
    records: 0,
    objects: 0,
    parts: 0,
    sessions: 0,
    stored: 0,
    restored: 0,
  }
  readonly inventory = createHash('sha256')
  readonly directory: string
  private readonly manifest: FileHandle

  private constructor(directory: string, manifest: FileHandle) {
    this.directory = directory
    this.manifest = manifest
  }

  static async create(directory: string) {
    await privateDirectory(join(directory, 'parts'))
    await privateDirectory(join(directory, 'membership'))
    return new PackageObjects(
      directory,
      await open(join(directory, 'manifest.ndjson'), 'wx', 0o600),
    )
  }

  async entry(value: ImportManifestEntry) {
    const entry = readImportManifestEntry(value)
    const line = `${JSON.stringify(entry)}\n`
    await this.manifest.writeFile(line)
    this.inventory.update(line)
    this.totals.records++
    if (entry.kind === 'session') this.totals.sessions++
  }

  async object(
    path: string,
    purpose: ImportContentObject['purpose'],
    encoding: ImportContentObject['encoding'],
    restoredBytes: number | undefined,
    signal: AbortSignal,
  ) {
    signal.throwIfAborted()
    const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    const stat = await file.stat()
    if (!stat.isFile()) {
      await file.close()
      throw new LocalImportError('read_failed')
    }
    const id = randomUUID()
    const count = Math.max(1, Math.ceil(stat.size / IMPORT_PART_BYTES))
    const restored = restoredBytes ?? stat.size
    try {
      await this.entry({
        kind: 'object',
        id,
        purpose,
        encoding,
        sizeBytes: stat.size,
        restoredBytes: restored,
        partCount: count,
      })
      for (let index = 0; index < count; index++) {
        signal.throwIfAborted()
        const bytes = Buffer.alloc(
          Math.min(IMPORT_PART_BYTES, stat.size - index * IMPORT_PART_BYTES),
        )
        let offset = 0
        while (offset < bytes.length) {
          const read = await file.read(
            bytes,
            offset,
            bytes.length - offset,
            null,
          )
          if (!read.bytesRead) throw new LocalImportError('read_failed')
          offset += read.bytesRead
        }
        const part = {
          id: randomUUID(),
          group:
            purpose === 'document' ? ('document' as const) : ('work' as const),
          sizeBytes: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        }
        const entry: ImportObjectPart = {
          kind: 'part',
          objectId: id,
          index,
          part,
        }
        await writeFile(join(this.directory, 'parts', part.id), bytes, {
          flag: 'wx',
          mode: 0o600,
        })
        await writeFile(
          join(this.directory, 'membership', part.id),
          JSON.stringify(entry),
          { flag: 'wx', mode: 0o600 },
        )
        await this.entry(entry)
      }
      this.totals.objects++
      this.totals.parts += count
      this.totals.stored += stat.size
      this.totals.restored += restored
      return id
    } finally {
      await file.close()
    }
  }

  async close() {
    await this.manifest.close()
  }
}
