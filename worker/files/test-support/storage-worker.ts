import { DurableObject } from 'cloudflare:workers'

import { isRecord } from '../../http'
import { durableFilesStorage, type FilesStorage } from '../storage'

interface StorageWorkerEnv {
  FILES: DurableObjectNamespace<StoredFiles>
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
      await this.files.write(value.updates, readKeys(value.removals))
      return new Response(null, { status: 204 })
    }
    const key = url.searchParams.get('key')
    if (key === null) throw new Error('Missing storage key')
    const value = await this.files.get(key)
    return Response.json(value === undefined ? {} : { value })
  }

  private async inspect(): Promise<Response> {
    const entries = await this.ctx.storage.list<unknown>({
      prefix: 'files:state:v1',
    })
    const sizes = [...entries.values()]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => new TextEncoder().encode(value).byteLength)
    const keys = [...entries.keys()]
    return Response.json({
      chunks: sizes.length,
      treeChunks: keys.filter((key) => key.startsWith('files:state:v1:tree:'))
        .length,
      changesChunks: keys.filter((key) =>
        key.startsWith('files:state:v1:changes:'),
      ).length,
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
