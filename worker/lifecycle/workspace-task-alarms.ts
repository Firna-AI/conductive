import {
  WorkspaceAlarms,
  writeWorkspaceAlarm,
  type AlarmSource,
  type AlarmTransaction,
} from '../features/alarms'
import type { WorkspaceStorage, WorkspaceTransaction } from './platform-storage'

function alarmTransaction(storage: WorkspaceTransaction): AlarmTransaction {
  return {
    read: () => storage.list('number', { prefix: 'alarm:' }),
    put: (key, at) => storage.put('number', key, at),
    delete: (key) => storage.delete(key),
    setAlarm: (at) => storage.setAlarm(at),
    deleteAlarm: () => storage.deleteAlarm(),
  }
}

export function workspaceTaskAlarms(
  storage: WorkspaceStorage,
): WorkspaceAlarms {
  return new WorkspaceAlarms({
    transaction: (operation) =>
      storage.transaction((transaction) =>
        operation(alarmTransaction(transaction)),
      ),
  })
}

export function taskWorkspaceStorage(
  storage: WorkspaceStorage,
  source: AlarmSource,
): WorkspaceStorage {
  const owned = (transaction: WorkspaceTransaction): WorkspaceTransaction => ({
    get: transaction.get.bind(transaction),
    put: transaction.put.bind(transaction),
    delete: transaction.delete.bind(transaction),
    list: transaction.list.bind(transaction),
    setAlarm: (at) =>
      writeWorkspaceAlarm(alarmTransaction(transaction), source, at),
    deleteAlarm: () =>
      writeWorkspaceAlarm(alarmTransaction(transaction), source, null),
  })
  return {
    ...owned(storage),
    setAlarm: (at) =>
      storage.transaction((transaction) => owned(transaction).setAlarm(at)),
    deleteAlarm: () =>
      storage.transaction((transaction) => owned(transaction).deleteAlarm()),
    transaction: (operation) =>
      storage.transaction((transaction) => operation(owned(transaction))),
  }
}
