import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { open, rename, rm } from 'node:fs/promises'

import { object, string, integer } from './parse'
import { ImportStorage, readImportJson, saveImportJson } from './import-storage'

export interface ImportLfsTransport {
  fetch: typeof globalThis.fetch
  credential(activationId: string, signal: AbortSignal): Promise<string>
}

function unavailable(): Error {
  return new Error(
    'The repository file could not be downloaded. Your stored work is kept. Try again.',
  )
}

export const importLfsTransport: ImportLfsTransport = {
  fetch: (request, init) => globalThis.fetch(request, init),
  credential: (activationId, signal) =>
    new Promise((resolve, reject) => {
      const child = spawn(
        '/usr/local/bin/conductive-git-credential',
        ['token'],
        {
          signal,
          env: {
            ...process.env,
            CONDUCTIVE_TURN_ID: '',
            CONDUCTIVE_ACTIVATION_ID: activationId,
          },
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      )
      const chunks: Buffer[] = []
      let size = 0
      child.stdout.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > 1_048_576) {
          child.kill()
          reject(unavailable())
        } else chunks.push(chunk)
      })
      child.on('error', () => reject(unavailable()))
      child.on('close', (code) => {
        const token = Buffer.concat(chunks).toString('utf8').trim()
        if (code !== 0 || !token || /[\r\n]/u.test(token)) reject(unavailable())
        else resolve(token)
      })
    }),
}

async function readBatch(response: Response): Promise<unknown> {
  if (!response.ok || !response.body) throw unavailable()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      length += chunk.value.length
      if (length > 1_048_576) {
        await reader.cancel()
        throw unavailable()
      }
      chunks.push(chunk.value)
    }
  } finally {
    reader.releaseLock()
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export async function downloadImportLfs(
  storage: ImportStorage,
  repository: string,
  oid: string,
  size: number,
  activationId: string,
  signal: AbortSignal,
  transport = importLfsTransport,
) {
  const destination = storage.path('lfs-bytes', oid)
  if (
    (await readImportJson(storage.path('lfs-complete', oid))) === size &&
    (await storage.hash(destination)) === oid
  )
    return destination
  const token = await transport.credential(activationId, signal)
  const authorization = `Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`
  const batchUrl = new URL(
    `https://github.com/${repository}.git/info/lfs/objects/batch`,
  )
  const response = await transport.fetch(batchUrl, {
    method: 'POST',
    redirect: 'error',
    credentials: 'omit',
    signal,
    headers: {
      Authorization: authorization,
      Accept: 'application/vnd.git-lfs+json',
      'Content-Type': 'application/vnd.git-lfs+json',
    },
    body: JSON.stringify({
      operation: 'download',
      transfers: ['basic'],
      objects: [{ oid, size }],
    }),
  })
  const result = object(await readBatch(response))
  if (!Array.isArray(result.objects) || result.objects.length !== 1)
    throw unavailable()
  const offered = object(result.objects[0])
  if (
    offered.oid !== oid ||
    integer(offered.size) !== size ||
    offered.error !== undefined
  )
    throw unavailable()
  const action = object(object(offered.actions).download)
  const url = new URL(string(action.href))
  if (url.protocol !== 'https:' || url.username || url.password || url.hash)
    throw unavailable()
  const headers: Record<string, string> = {}
  if (action.header !== undefined)
    for (const [name, value] of Object.entries(object(action.header))) {
      const text = string(value)
      if (
        url.origin !== batchUrl.origin &&
        (text.includes(token) ||
          text === authorization ||
          (/^Basic\s/i.test(text) &&
            Buffer.from(text.slice(6), 'base64').toString().includes(token)))
      )
        throw unavailable()
      headers[name] = text
    }
  const download = await transport.fetch(url, {
    method: 'GET',
    redirect: 'error',
    credentials: 'omit',
    headers,
    signal,
    referrerPolicy: 'no-referrer',
  })
  if (!download.ok || !download.body) throw unavailable()
  const temporary = `${destination}.${randomUUID()}`
  const file = await open(temporary, 'wx', 0o600)
  const reader = download.body.getReader()
  const hash = createHash('sha256')
  let length = 0
  let installed = false
  try {
    while (true) {
      signal.throwIfAborted()
      const chunk = await reader.read()
      if (chunk.done) break
      length += chunk.value.length
      if (length > size) throw unavailable()
      hash.update(chunk.value)
      await file.writeFile(chunk.value)
    }
    if (length !== size || hash.digest('hex') !== oid) throw unavailable()
    await file.sync()
    await rename(temporary, destination)
    installed = true
    await saveImportJson(storage.path('lfs-complete', oid), size)
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
    await file.close()
    if (!installed) await rm(temporary, { force: true })
  }
  return destination
}
