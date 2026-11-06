import type { DurableLifecycleState } from './durable-types'
import type { FailedCreationDraft } from './failed-creations'
import type { ImageCoordinatorState } from './image-timers'
import type {
  WorkspaceStartJob,
  WorkspaceStartResult,
  CreationPublication,
} from './start-types'
import type { PendingTurn } from './workspace-runtime'

export interface WorkspaceValues {
  lifecycle: DurableLifecycleState
  job: WorkspaceStartJob
  result: WorkspaceStartResult
  publication: CreationPublication
  turns: PendingTurn[]
  image: ImageCoordinatorState
  draft: FailedCreationDraft
  number: number
  text: string
}

export interface WorkspaceTransaction {
  get<K extends keyof WorkspaceValues>(
    kind: K,
    key: string,
  ): Promise<WorkspaceValues[K] | undefined>
  put<K extends keyof WorkspaceValues>(
    kind: K,
    key: string,
    value: WorkspaceValues[K],
  ): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  list<K extends keyof WorkspaceValues>(
    kind: K,
    options?: DurableObjectListOptions,
  ): Promise<Map<string, WorkspaceValues[K]>>
  setAlarm(at: number): Promise<void>
  deleteAlarm(): Promise<void>
}

export interface WorkspaceStorage extends WorkspaceTransaction {
  transaction<T>(
    operation: (storage: WorkspaceTransaction) => Promise<T>,
  ): Promise<T>
}

class NativeOperations implements WorkspaceTransaction {
  protected readonly native: Pick<
    DurableObjectTransaction,
    'get' | 'put' | 'delete' | 'list' | 'setAlarm' | 'deleteAlarm'
  >
  constructor(
    native: Pick<
      DurableObjectTransaction,
      'get' | 'put' | 'delete' | 'list' | 'setAlarm' | 'deleteAlarm'
    >,
  ) {
    this.native = native
  }
  get<K extends keyof WorkspaceValues>(_kind: K, key: string) {
    return this.native.get<WorkspaceValues[K]>(key)
  }
  put<K extends keyof WorkspaceValues>(
    _kind: K,
    key: string,
    value: WorkspaceValues[K],
  ) {
    return this.native.put(key, value)
  }
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  delete(key: string | string[]) {
    return Array.isArray(key)
      ? this.native.delete(key)
      : this.native.delete(key)
  }
  list<K extends keyof WorkspaceValues>(
    _kind: K,
    options?: DurableObjectListOptions,
  ) {
    return this.native.list<WorkspaceValues[K]>(options)
  }
  setAlarm(at: number) {
    return this.native.setAlarm(at)
  }
  deleteAlarm() {
    return this.native.deleteAlarm()
  }
}

export function nativeWorkspaceStorage(
  storage: DurableObjectStorage,
): WorkspaceStorage {
  const operations = new NativeOperations(storage)
  return {
    get: operations.get.bind(operations),
    put: operations.put.bind(operations),
    delete: operations.delete.bind(operations),
    list: operations.list.bind(operations),
    setAlarm: operations.setAlarm.bind(operations),
    deleteAlarm: operations.deleteAlarm.bind(operations),
    transaction: (operation) =>
      storage.transaction((transaction) =>
        operation(new NativeOperations(transaction)),
      ),
  }
}
