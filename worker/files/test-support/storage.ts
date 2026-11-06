import { Miniflare } from 'miniflare'

import { isRecord } from '../../http'
import type { FilesStorage } from '../storage'
import { storageWorkerBundle } from './storage-bundle'

/** The adapter stores each projection in actual SQLite Durable Object storage. */
export async function createFilesStorage() {
  const contents = await storageWorkerBundle()
  const runtime = new Miniflare({
    enableDevRegistry: false,
    telemetry: { enabled: false },
    cf: false,
    workers: [
      {
        config: {
          name: 'files-storage-tests',
          compatibilityDate: '2026-11-06',
          exports: {
            StoredFiles: { type: 'durable-object', storage: 'sqlite' },
          },
          env: {
            FILES: {
              type: 'durable-object',
              worker: 'files-storage-tests',
              exportName: 'StoredFiles',
            },
          },
          manifest: {
            mainModule: 'index.js',
            modules: {
              'index.js': {
                type: 'esm',
                contents,
              },
            },
          },
        },
      },
    ],
  })
  return {
    storage(name: string): FilesStorage {
      return {
        async get(key) {
          const response = await runtime.dispatchFetch(
            `https://storage.test/?${new URLSearchParams({ name, key })}`,
          )
          const value: unknown = await response.json()
          if (!isRecord(value)) throw new Error('Invalid test storage response')
          return value.value
        },
        async getMany(keys) {
          const response = await runtime.dispatchFetch(
            `https://storage.test/?${new URLSearchParams({ name })}`,
            { method: 'POST', body: JSON.stringify({ keys }) },
          )
          const value: unknown = await response.json()
          if (!Array.isArray(value)) throw new Error('Invalid storage entries')
          const entries = new Map<string, unknown>()
          for (const item of value) {
            if (
              !Array.isArray(item) ||
              item.length !== 2 ||
              typeof item[0] !== 'string'
            ) {
              throw new Error('Invalid storage entry')
            }
            entries.set(item[0], item[1])
          }
          return entries
        },
        async write(updates, removals) {
          const response = await runtime.dispatchFetch(
            `https://storage.test/?${new URLSearchParams({ name })}`,
            { method: 'PUT', body: JSON.stringify({ updates, removals }) },
          )
          if (response.status !== 204)
            throw new Error('Test storage write failed')
        },
      }
    },
    evict: (name: string) =>
      runtime.unsafeEvictDurableObject('files-storage-tests', 'StoredFiles', {
        name,
      }),
    async inspect(name: string): Promise<unknown> {
      return (
        await runtime.dispatchFetch(
          `https://storage.test/?${new URLSearchParams({ name, inspect: '1' })}`,
        )
      ).json()
    },
    dispose: () => runtime.dispose(),
  }
}

export type FilesStorageHarness = Awaited<ReturnType<typeof createFilesStorage>>
