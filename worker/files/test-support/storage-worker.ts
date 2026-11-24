import { DurableObject } from 'cloudflare:workers'

import { isRecord } from '../../http'
import { FILES_KEY } from '../bucket-layout'
import { FilesState } from '../state'
import { durableFilesStorage, type FilesStorage } from '../storage'
import { writeStorageRecord } from './storage-record'

interface StorageWorkerEnv {
  FILES: DurableObjectNamespace<StoredFiles>
}

class BucketWriteFailure extends Error {
  readonly keys: string[]

  constructor(keys: string[]) {
    super('Test bucket write failed')
    this.keys = keys
  }
}

export class StoredFiles extends DurableObject<StorageWorkerEnv> {
  private readonly files: FilesStorage

  constructor(ctx: DurableObjectState, env: StorageWorkerEnv) {
    super(ctx, env)
    this.files = durableFilesStorage(ctx.storage)
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.searchParams.has('inspect')) return this.inspect()
    if (request.method === 'PATCH') return this.applyEvent(await request.json())
    if (request.method === 'POST') {
      const value: unknown = await request.json()
      if (!isRecord(value)) throw new Error('Invalid storage read request')
      return Response.json([
        ...(await this.files.getMany(readKeys(value.keys))),
      ])
    }
    if (request.method === 'PUT') {
      const value: unknown = await request.json()
      if (!isRecord(value) || !isRecord(value.updates)) {
        throw new Error('Invalid storage write request')
      }
      const removals = readKeys(value.removals)
      await writeStorageRecord(this.files, value.updates, removals)
      return new Response(null, { status: 204 })
    }
    const key = url.searchParams.get('key')
    if (key === null) throw new Error('Missing storage key')
    const value = await this.files.get(key)
    return Response.json(value === undefined ? {} : { value })
  }

  private async applyEvent(value: unknown): Promise<Response> {
    if (!isRecord(value) || typeof value.connectionId !== 'string')
      throw new Error('Invalid standalone apply request')
    const { connectionId, event, failAfterBucketWrites } = value
    const keys: string[] = []
    const storage: FilesStorage = {
      ...this.files,
      transaction: (work) =>
        this.files.transaction((transaction) =>
          work({
            ...transaction,
            async put(key, next) {
              await transaction.put(key, next)
              if (key.startsWith(`${FILES_KEY}:tree:bucket:`)) {
                keys.push(key)
                if (keys.length === failAfterBucketWrites)
                  throw new BucketWriteFailure(keys)
              }
            },
          }),
        ),
    }
    try {
      return Response.json(
        await new FilesState(storage).apply(connectionId, event),
      )
    } catch (error) {
      if (!(error instanceof BucketWriteFailure)) throw error
      return Response.json(error.keys, { status: 409 })
    }
  }

  private async inspect(): Promise<Response> {
    const prefix = `${FILES_KEY}:`
    const entries = await this.ctx.storage.list<unknown>({ prefix })
    const sizes = [...entries.values()]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => new TextEncoder().encode(value).byteLength)
    const keys = [...entries.keys()].map((key) => key.slice(prefix.length))
    return Response.json({
      chunks: sizes.length,
      treeChunks: keys.filter((key) => /^tree:\d+$/.test(key)).length,
      changesChunks: keys.filter((key) => /^changes:\d+$/.test(key)).length,
      treeBucketChunks: keys.filter((key) => /^tree:bucket:\d+:\d+$/.test(key))
        .length,
      changesBucketChunks: keys.filter((key) =>
        /^changes:bucket:\d+:\d+$/.test(key),
      ).length,
      treeOrderChunks: keys.filter((key) => /^tree:order:\d+$/.test(key))
        .length,
      changesOrderChunks: keys.filter((key) => /^changes:order:\d+$/.test(key))
        .length,
      maxBytes: Math.max(0, ...sizes),
      totalBytes: sizes.reduce((sum, size) => sum + size, 0),
    })
  }
}

function readKeys(value: unknown): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((key): key is string => typeof key === 'string')
  ) {
    throw new Error('Invalid storage keys')
  }
  return value
}

export default {
  fetch(request: Request, env: StorageWorkerEnv): Promise<Response> {
    const name = new URL(request.url).searchParams.get('name')
    if (name === null) throw new Error('Missing storage name')
    return env.FILES.get(env.FILES.idFromName(name)).fetch(request)
  },
} satisfies ExportedHandler<StorageWorkerEnv>
