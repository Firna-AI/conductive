import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, open, readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'

import type {
  ImportManifestEntry,
  ImportSnapshot,
} from '../../src/shared/conductor-import-manifest.ts'
import {
  readImportManifestEntry,
  readImportSnapshot,
} from '../../src/shared/conductor-import-manifest-read.ts'
import type {
  RunnerImportCommand,
  RunnerImportResult,
} from '../../src/shared/runner-import.ts'

export const importDigest = (value: string | Uint8Array) =>
  createHash('sha256').update(value).digest('hex')

export async function readImportJson(
  path: string,
): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return
    throw error
  }
}

export async function saveImportJson(
  path: string,
  value: unknown,
): Promise<void> {
  const temporary = `${path}.next`
  const file = await open(temporary, 'w', 0o600)
  try {
    await file.writeFile(JSON.stringify(value))
    await file.sync()
  } finally {
    await file.close()
  }
  await rename(temporary, path)
  const directory = await open(join(path, '..'), 'r')
  try {
    await directory.sync()
  } finally {
    await directory.close()
  }
}

/** Content and receipts stay outside the checkout and survive runner restarts. */
export class ImportStorage {
  readonly directory: string
  constructor(home: string, activationId: string) {
    this.directory = join(
      home,
      '.conductive',
      'imports',
      importDigest(activationId),
    )
  }
  path(kind: string, id: string) {
    return join(this.directory, `${kind}-${importDigest(id)}`)
  }
  async prepare() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 })
  }
  async snapshot(): Promise<ImportSnapshot> {
    return readImportSnapshot(
      await readImportJson(join(this.directory, 'snapshot')),
    )
  }
  async *entries(): AsyncGenerator<ImportManifestEntry> {
    const snapshot = await this.snapshot()
    let offset = 0
    while (offset < snapshot.recordCount) {
      const page = await readImportJson(this.path('manifest', String(offset)))
      if (!Array.isArray(page) || !page.length)
        throw new Error('Missing import manifest page.')
      for (const value of page) {
        yield readImportManifestEntry(value)
        offset++
      }
    }
    if (offset !== snapshot.recordCount)
      throw new Error('Invalid import manifest count.')
  }
  async receipt(
    command: RunnerImportCommand,
  ): Promise<RunnerImportResult | undefined> {
    const saved = await readImportJson(this.path('receipt', command.commandId))
    if (saved === undefined) return
    if (
      typeof saved !== 'object' ||
      saved === null ||
      !('digest' in saved) ||
      !('result' in saved) ||
      saved.digest !== importDigest(JSON.stringify(command.action))
    )
      throw new Error('The import command changed on replay.')
    const { readRunnerImportReply } =
      await import('../../src/shared/runner-import-read.ts')
    return readRunnerImportReply({
      ...command,
      type: 'import.result',
      result: saved.result,
    }).result
  }
  async remember(command: RunnerImportCommand, result: RunnerImportResult) {
    await saveImportJson(this.path('receipt', command.commandId), {
      digest: importDigest(JSON.stringify(command.action)),
      result,
    })
  }
  async mark(id: string, action: () => Promise<void>): Promise<void> {
    const path = this.path('applied', id)
    if (await readImportJson(path)) return
    await action()
    await saveImportJson(path, true)
  }
  async hash(path: string): Promise<string> {
    const digest = createHash('sha256')
    for await (const bytes of createReadStream(path)) digest.update(bytes)
    return digest.digest('hex')
  }
}
