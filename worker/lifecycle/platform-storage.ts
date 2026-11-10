import type { DurableLifecycleState } from './durable-types'
import type { ImageCoordinatorState } from './image-timers'
import type {
  WorkspaceStartResult,
  CreationPublication,
  CompletedWorkspaceCreation,
} from './start-types'
import type { StoredWorkspaceStartJob } from './start-job-codec'
import type { FirstWorkspaceMessage, PendingTurn } from './workspace-runtime'
import { assertReceiverActive } from '../members/receiver-fence'
import type { ReceiverStorage } from '../members/receiver-storage'
import type { ComputerStopTaskState } from './computer-stop-task'

export interface WorkspaceValues {
  lifecycle: DurableLifecycleState
  job: StoredWorkspaceStartJob
  result: WorkspaceStartResult
  publication: CreationPublication
  creation: CompletedWorkspaceCreation
  turns: PendingTurn[]
  image: ImageCoordinatorState
  first: FirstWorkspaceMessage
  number: number
  text: string
  computerStops: ComputerStopTaskState
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
  private readonly guarded: boolean
  private readonly generation: () => number | undefined
  protected readonly native: Pick<
    ReceiverStorage,
    'get' | 'put' | 'delete' | 'list' | 'setAlarm' | 'deleteAlarm'
  >
  constructor(
    native: Pick<
      ReceiverStorage,
      'get' | 'put' | 'delete' | 'list' | 'setAlarm' | 'deleteAlarm'
    >,
    guarded = false,
    generation: () => number | undefined = () => undefined,
  ) {
    this.native = native
    this.guarded = guarded
    this.generation = generation
  }
  get<K extends keyof WorkspaceValues>(_kind: K, key: string) {
    return this.native.get<WorkspaceValues[K]>(key)
  }
  async put<K extends keyof WorkspaceValues>(
    _kind: K,
    key: string,
    value: WorkspaceValues[K],
  ) {
    if (this.guarded) await assertReceiverActive(this.native, this.generation())
    return this.native.put(key, value)
  }
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  async delete(key: string | string[]) {
    if (this.guarded) await assertReceiverActive(this.native, this.generation())
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
  async setAlarm(at: number) {
    if (this.guarded) await assertReceiverActive(this.native, this.generation())
    return this.native.setAlarm(at)
  }
  async deleteAlarm() {
    if (this.guarded) await assertReceiverActive(this.native, this.generation())
    return this.native.deleteAlarm()
  }
}

class NativeTransaction extends NativeOperations {
  constructor(
    transaction: DurableObjectTransaction,
    guarded = false,
    generation?: () => number | undefined,
  ) {
    super(transaction, guarded, generation)
  }
}

export interface NativeWorkspaceStorageOptions {
  guarded?: boolean
  generation?: () => number | undefined
}

export function nativeWorkspaceStorage(
  storage: ReceiverStorage,
  options: NativeWorkspaceStorageOptions = {},
): WorkspaceStorage {
  const guarded = options.guarded ?? false
  const generation = options.generation ?? (() => undefined)
  const operations = new NativeOperations(storage)
  const transaction = <T>(
    operation: (storage: WorkspaceTransaction) => Promise<T>,
  ) =>
    storage.transaction(async (native) => {
      const transaction = new NativeTransaction(native, guarded, generation)
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
    get: operations.get.bind(operations),
    put: (kind, key, value) =>
      transaction((storage) => storage.put(kind, key, value)),
    delete: remove,
    list: operations.list.bind(operations),
    setAlarm: operations.setAlarm.bind(operations),
    deleteAlarm: operations.deleteAlarm.bind(operations),
    transaction,
  }
}
