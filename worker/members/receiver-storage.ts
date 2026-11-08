import { cleanupBusy } from './cleanup-lease'
import { LIFECYCLE_FENCE_KEY, type ReceiverFence } from './receiver-fence'

export interface ReceiverStorage extends Pick<
  DurableObjectStorage,
  'get' | 'list' | 'transaction' | 'setAlarm' | 'deleteAlarm'
> {
  put<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
}

export function receiverStorage(
  storage: DurableObjectStorage,
): ReceiverStorage {
  const transaction = <T>(
    operation: (transaction: DurableObjectTransaction) => Promise<T>,
  ) =>
    storage.transaction(async (transaction) => {
      const fence = await transaction.get<ReceiverFence>(LIFECYCLE_FENCE_KEY)
      if (fence?.mode === 'purged') throw cleanupBusy()
      return operation(transaction)
    })
  function remove(key: string): Promise<boolean>
  function remove(keys: string[]): Promise<number>
  function remove(key: string | string[]): Promise<boolean | number> {
    return Array.isArray(key)
      ? transaction((storage) => storage.delete(key))
      : transaction((storage) => storage.delete(key))
  }
  return {
    get: storage.get.bind(storage),
    list: storage.list.bind(storage),
    put: (key, value) => transaction((storage) => storage.put(key, value)),
    delete: remove,
    transaction,
    setAlarm: (...args) => transaction((storage) => storage.setAlarm(...args)),
    deleteAlarm: (...args) =>
      transaction((storage) => storage.deleteAlarm(...args)),
  }
}
