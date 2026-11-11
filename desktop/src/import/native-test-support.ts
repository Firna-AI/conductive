import { chmod, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { zstdCompressSync } from 'node:zlib'
import { importTemporaryDirectory } from '../../tests/import-temporary.ts'

export const withNativeFixture = async (
  run: (root: string) => Promise<void>,
) => {
  const root = await importTemporaryDirectory(tmpdir(), 'conductive-native-')
  try {
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

export const nativeFile = async (
  root: string,
  name: string,
  rows: readonly unknown[],
) => {
  const decoded = Buffer.from(rows.map((row) => JSON.stringify(row)).join('\n'))
  const original = name.endsWith('.zst') ? zstdCompressSync(decoded) : decoded
  return { ...(await rawNativeFile(root, name, original)), decoded }
}

export const rawNativeFile = async (
  root: string,
  name: string,
  original: Buffer,
) => {
  const path = join(root, name)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, original)
  await chmod(path, 0o400)
  return { path, original }
}

export const claudeRow = (
  uuid: string,
  parentUuid: string | null,
  type: 'user' | 'assistant',
  content: unknown,
  extra: Record<string, unknown> = {},
  messageId?: string,
) => ({
  uuid,
  parentUuid,
  type,
  timestamp: '2026-11-09T09:00:00.000Z',
  message: { role: type, content, id: messageId },
  ...extra,
})

export const codexRow = (payload: unknown, timestamp?: string) => ({
  type: 'response_item',
  timestamp,
  payload,
})
