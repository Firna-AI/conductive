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
      const storage: FilesStorage = {
        async get(key) {
          const response = await runtime.dispatchFetch(
            `https://storage.test/?${new URLSearchParams({ name, key })}`,
          )
          const value: unknown = await response.json()
          if (!isRecord(value)) throw new Error('Invalid test storage response')
          return value.value
        },
        async getMany(keys) {
          if (keys.length === 0) return new Map()
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
        async transaction(work) {
          const updates = new Map<string, unknown>()
          const removals = new Set<string>()
          const result = await work({
            get: (key) => {
              if (removals.has(key)) return Promise.resolve(undefined)
              if (updates.has(key)) return Promise.resolve(updates.get(key))
              return storage.get(key)
            },
            async getMany(keys) {
              const stored = await storage.getMany(
                keys.filter((key) => !updates.has(key) && !removals.has(key)),
              )
              const values = new Map(stored)
              for (const key of keys) {
                if (updates.has(key)) values.set(key, updates.get(key))
              }
              return values
            },
            async put(key, value) {
              updates.set(key, value)
              removals.delete(key)
            },
            async delete(key) {
              if (removals.has(key)) return false
              const existed =
                updates.has(key) || (await storage.get(key)) !== undefined
              updates.delete(key)
              removals.add(key)
              return existed
            },
          })
          if (updates.size === 0 && removals.size === 0) return result
          const response = await runtime.dispatchFetch(
            `https://storage.test/?${new URLSearchParams({ name })}`,
            {
              method: 'PUT',
              body: JSON.stringify({
                updates: Object.fromEntries(updates),
                removals: [...removals],
              }),
            },
          )
          if (response.status !== 204)
            throw new Error('Test storage write failed')
          return result
        },
      }
      return storage
    },
    evict: (name: string) =>
      runtime.unsafeEvictDurableObject('files-storage-tests', 'StoredFiles', {
        name,
      }),
    async apply(
      name: string,
      connectionId: string,
      event: unknown,
      failAfterBucketWrites?: number,
    ) {
      const response = await runtime.dispatchFetch(
        `https://storage.test/?${new URLSearchParams({ name })}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ connectionId, event, failAfterBucketWrites }),
        },
      )
      const result: unknown = await response.json()
      if (response.status === 409) {
        throw Object.assign(new Error('Test bucket write failed'), {
          keys: result,
        })
      }
      if (response.status !== 200 || typeof result !== 'boolean')
        throw new Error('Invalid standalone apply response')
      return result
    },
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
