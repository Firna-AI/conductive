import type { FilesStorage } from '../files/storage'
import type { ChatData } from './types'

/** Reuse the receipt transaction. No nested transaction can outlive its cursor. */
export function chatFilesStorage(data: ChatData): FilesStorage {
  return {
    get: (key) => data.get<unknown>(key),
    getMany: async (keys) =>
      new Map(
        await Promise.all(
          keys.map(async (key) => [key, await data.get<unknown>(key)] as const),
        ),
      ),
    async write(updates, removals) {
      for (const [key, value] of Object.entries(updates))
        await data.put(key, value)
      for (const key of removals) await data.delete(key)
    },
  }
}
