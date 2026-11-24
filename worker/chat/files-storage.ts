import type { FilesStorage, FilesTransaction } from '../files/storage'
import type { ChatData } from './types'

/** Reuse the receipt transaction. No nested transaction can outlive its cursor. */
export function chatFilesStorage(data: ChatData): FilesStorage {
  const transaction: FilesTransaction = {
    get: (key) => data.get<unknown>(key),
    getMany: async (keys) =>
      new Map(
        await Promise.all(
          keys.map(async (key) => [key, await data.get<unknown>(key)] as const),
        ),
      ),
    put: (key, value) => data.put(key, value),
    delete: (key) => data.delete(key),
  }
  return {
    get: transaction.get,
    getMany: transaction.getMany,
    transaction: (work) => work(transaction),
  }
}
