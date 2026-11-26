import type { FilesReader, FilesStorage } from '../storage'

export function observeFilesStorage(source: FilesStorage) {
  const reads: string[][] = []
  const writes: { updates: Record<string, unknown>; removals: string[] }[] = []
  let activeReads = 0
  let maxConcurrentReads = 0

  const read = async <T>(
    keys: readonly string[],
    work: () => Promise<T>,
  ): Promise<T> => {
    reads.push([...keys])
    activeReads++
    maxConcurrentReads = Math.max(maxConcurrentReads, activeReads)
    try {
      return await work()
    } finally {
      activeReads--
    }
  }
  const reader = (scope: FilesReader): FilesReader => ({
    get: (key) => read([key], () => scope.get(key)),
    getMany: (keys) => read(keys, () => scope.getMany(keys)),
  })
  const storage: FilesStorage = {
    ...reader(source),
    transaction: (work) =>
      source.transaction(async (transaction) => {
        const updates: Record<string, unknown> = {}
        const removals: string[] = []
        const result = await work({
          ...reader(transaction),
          async put(key, value) {
            updates[key] = value
            await transaction.put(key, value)
          },
          async delete(key) {
            removals.push(key)
            return transaction.delete(key)
          },
        })
        if (Object.keys(updates).length > 0 || removals.length > 0)
          writes.push({ updates, removals })
        return result
      }),
  }
  return {
    storage,
    reads,
    writes,
    get maxConcurrentReads() {
      return maxConcurrentReads
    },
  }
}
