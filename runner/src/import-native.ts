import { createReadStream, createWriteStream } from 'node:fs'
import { realpath } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import {
  importDocumentFile,
  type ImportNativeSession,
} from '../../src/shared/conductor-import-manifest.ts'
import { importSessionId } from '../../src/shared/runner-import.ts'
import { codexHeader } from './import-native-header'
import { importObjectPath } from './import-objects'
import { replaceImportFile } from './import-paths'
import { ImportStorage, saveImportJson } from './import-storage'
import type { EventStore } from './state'
import { NativeHistoryError } from './providers/native-history'
import { importNativeLocation } from './import-native-location'

export function claudeProjectKey(path: string) {
  const encoded = path.replace(/[^a-zA-Z0-9]/g, '-')
  if (encoded.length <= 200) return encoded
  let hash = 0
  for (let index = 0; index < path.length; index++)
    hash = ((hash << 5) - hash + path.charCodeAt(index)) | 0
  return `${encoded.slice(0, 200)}-${Math.abs(hash).toString(36)}`
}

async function readableHistory(
  path: string,
  agent: ImportNativeSession['agent'],
  signal: AbortSignal,
) {
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
  for await (const chunk of createReadStream(path, { signal })) {
    try {
      decoder.decode(chunk, { stream: true })
    } catch {
      return false
    }
  }
  try {
    decoder.decode()
  } catch {
    return false
  }
  const lines = createInterface({
    input: createReadStream(path, { signal }),
    crlfDelay: Infinity,
  })
  let valid = false
  for await (const line of lines) {
    if (!line.trim()) continue
    try {
      const row: unknown = JSON.parse(line)
      if (
        typeof row === 'object' &&
        row !== null &&
        'type' in row &&
        (agent === 'claude'
          ? row.type === 'user' || row.type === 'assistant'
          : row.type === 'session_meta')
      )
        valid = true
    } catch {
      /* Native readers tolerate invalid trailing records. */
    }
  }
  return valid
}

async function mappedCodexCopy(
  source: string,
  destination: string,
  signal: AbortSignal,
) {
  let pending = Buffer.alloc(0)
  let header = true
  const transform = new Transform({
    transform(bytes: Buffer, _encoding, callback) {
      if (!header) {
        callback(null, bytes)
        return
      }
      pending = Buffer.concat([pending, bytes])
      const newline = pending.indexOf(10)
      if (newline < 0) {
        callback()
        return
      }
      try {
        this.push(codexHeader(pending.subarray(0, newline)))
        this.push(pending.subarray(newline))
        pending = Buffer.alloc(0)
        header = false
        callback()
      } catch (error) {
        callback(
          error instanceof Error ? error : new Error('Invalid native header.'),
        )
      }
    },
    flush(callback) {
      try {
        if (header && pending.length) this.push(codexHeader(pending))
        callback()
      } catch (error) {
        callback(
          error instanceof Error ? error : new Error('Invalid native header.'),
        )
      }
    },
  })
  await pipeline(
    createReadStream(source),
    transform,
    createWriteStream(destination, { mode: 0o600 }),
    { signal },
  )
}

export async function restoreImportSession(
  storage: ImportStorage,
  recipe: ImportNativeSession,
  cwd: string,
  home: string,
  store: EventStore,
  signal: AbortSignal,
) {
  const source = await importObjectPath(storage, recipe.memoryObjectId, signal)
  const document = await importObjectPath(
    storage,
    recipe.documentObjectId,
    signal,
  )
  await storage.mark(`document:${recipe.id}`, () =>
    replaceImportFile(cwd, importDocumentFile(recipe.id), document, 0o600),
  )
  let preparation: 'prepared' | 'fallback' = (await readableHistory(
    source,
    recipe.agent,
    signal,
  ))
    ? 'prepared'
    : 'fallback'
  if (preparation === 'prepared') {
    const path =
      recipe.agent === 'claude'
        ? `.conductive/claude/projects/${claudeProjectKey(await realpath(cwd))}/${recipe.nativePath}`
        : `.conductive/codex/${recipe.nativePath}`
    try {
      await storage.mark(`native:${recipe.id}`, async () => {
        let copied = source
        if (recipe.agent === 'codex') {
          copied = storage.path('codex-copy', recipe.id)
          await mappedCodexCopy(source, copied, signal)
        }
        const destination = importNativeLocation(cwd, home, path)
        await replaceImportFile(
          destination.root,
          destination.path,
          copied,
          0o600,
        )
      })
    } catch (error) {
      if (!(
        error instanceof NativeHistoryError || error instanceof SyntaxError
      ))
        throw error
      preparation = 'fallback'
    }
  }
  await store.remember({
    sessionId: importSessionId(recipe.id),
    agent: recipe.agent,
    providerSessionId: preparation === 'prepared' ? recipe.nativeId : null,
    conductorImport: { documentId: recipe.id, preparation },
  })
  await saveImportJson(storage.path('session', recipe.id), preparation)
}
