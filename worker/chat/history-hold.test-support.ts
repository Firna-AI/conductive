import { isRecord } from '../http'
import { CHAT_EVENT_PREFIX } from './storage-keys'

function signal() {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

/**
 * Holds one list of stored chat events until the test releases it. Each
 * history page of a replay reads one such list, so `hold(2)` lets the first
 * page out and holds the second one.
 */
export function holdHistoryLists(storage: Pick<DurableObjectStorage, 'list'>) {
  const state = { remaining: 0, entered: signal(), released: signal() }
  storage.list = new Proxy(storage.list, {
    apply: async (target, owner, args) => {
      const options: unknown = args[0]
      if (
        isRecord(options) &&
        options.prefix === CHAT_EVENT_PREFIX &&
        state.remaining > 0 &&
        --state.remaining === 0
      ) {
        state.entered.resolve()
        await state.released.promise
      }
      return Reflect.apply(target, owner, args)
    },
  })
  return {
    hold: (list: number) => {
      state.remaining = list
      state.entered = signal()
      state.released = signal()
    },
    entered: () => state.entered.promise,
    release: () => state.released.resolve(),
  }
}
