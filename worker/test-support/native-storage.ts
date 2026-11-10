import { nativeCommitView, type NativeCommitView } from './native-commit'

type NativeCommit = NativeCommitView

export interface NativeStorageHooks {
  beforeTransaction?(): Promise<void>
  beforeCommit?(commit: NativeCommit): Promise<void>
  afterCommit?(commit: NativeCommit): Promise<void>
  afterWrite?(keys: readonly string[]): Promise<void>
  afterWriteKeys?: readonly string[]
  afterRead?(key: string, value: unknown): Promise<void>
  afterList?(options: DurableObjectListOptions): Promise<void>
}

function intercept<T extends object>(
  target: T,
  methods: Record<string, (...args: unknown[]) => unknown>,
): T {
  return new Proxy(target, {
    get: (object, key) => {
      if (typeof key === 'string' && methods[key]) return methods[key]
      const value: unknown = Reflect.get(object, key)
      return typeof value === 'function' ? value.bind(object) : value
    },
  })
}

export function nativeStorageControls(
  context: DurableObjectState,
  hooks: NativeStorageHooks,
  now: () => number,
) {
  const storage = context.storage
  const transaction = storage.transaction.bind(storage)
  const put = storage.put.bind(storage)
  const get = storage.get.bind(storage)
  const setAlarm = storage.setAlarm.bind(storage)
  const deleteAlarm = storage.deleteAlarm.bind(storage)
  const list = storage.list.bind(storage)
  let alarmGeneration = 0
  const writes: string[] = []
  const notifyWrite = async (keys: readonly string[]) => {
    if (
      hooks.afterWriteKeys &&
      !keys.some((key) => hooks.afterWriteKeys?.includes(key))
    )
      return
    await hooks.afterWrite?.(keys)
  }

  function readNative<T>(
    key: string,
    options?: DurableObjectGetOptions,
  ): Promise<T | undefined>
  function readNative<T>(
    keys: string[],
    options?: DurableObjectGetOptions,
  ): Promise<Map<string, T>>
  async function readNative<T>(
    key: string | string[],
    options?: DurableObjectGetOptions,
  ) {
    const value =
      typeof key === 'string'
        ? await get<T>(key, options)
        : await get<T>(key, options)
    if (typeof key === 'string') await hooks.afterRead?.(key, value)
    return value
  }
  storage.get = readNative
  storage.list = async <T>(options?: DurableObjectListOptions) => {
    const values = await list<T>(options)
    await hooks.afterList?.(options ?? {})
    return values
  }
  storage.put = async (...args: unknown[]) => {
    await Reflect.apply(put, storage, args)
    const input = args[0]
    const keys =
      typeof input === 'string'
        ? [input]
        : input && typeof input === 'object'
          ? Object.keys(input)
          : []
    writes.push(...keys)
    await notifyWrite(keys)
  }
  storage.setAlarm = async (...args) => {
    await setAlarm(...args)
    alarmGeneration++
    await notifyWrite([])
  }
  storage.deleteAlarm = async (...args) => {
    await deleteAlarm(...args)
    alarmGeneration++
    await notifyWrite([])
  }
  storage.transaction = async (operation) => {
    await hooks.beforeTransaction?.()
    const changed: string[] = []
    let changedAlarms = 0
    const result = await transaction(async (native) => {
      const wrapped = intercept(native, {
        put: async (...args) => {
          const key = args[0]
          await Reflect.apply(native.put, native, args)
          if (typeof key === 'string') changed.push(key)
          else if (key && typeof key === 'object')
            changed.push(...Object.keys(key))
        },
        setAlarm: async (...args) => {
          const at = args[0]
          if (typeof at !== 'number' && !(at instanceof Date))
            throw new Error('Expected a native alarm time.')
          await native.setAlarm(at)
          changedAlarms++
        },
        deleteAlarm: async () => {
          await native.deleteAlarm()
          changedAlarms++
        },
      })
      const result = await operation(wrapped)
      await hooks.beforeCommit?.(nativeCommitView(wrapped, changed, now))
      return result
    })
    alarmGeneration += changedAlarms
    writes.push(...changed)
    await hooks.afterCommit?.(nativeCommitView(storage, changed, now))
    await notifyWrite(changed)
    return result
  }

  return {
    hooks,
    storage,
    writes: () => [...writes],
    alarmGeneration: () => alarmGeneration,
    records: () => storage.list({ prefix: '' }),
    unobservedPut: put,
  }
}
