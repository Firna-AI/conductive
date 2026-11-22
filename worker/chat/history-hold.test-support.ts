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
 * Holds or fails one list of stored chat events. Each history page of a
 * replay reads one such list, so `hold(2)` lets the first page out and holds
 * the second one until `release`. `fail(2)` makes the second list throw.
 */
export function holdHistoryLists(storage: Pick<DurableObjectStorage, 'list'>) {
  const state = {
    remaining: 0,
    fail: false,
    entered: signal(),
    released: signal(),
  }
  storage.list = new Proxy(storage.list, {
    apply: async (target, owner, args) => {
      const options: unknown = args[0]
      if (
        isRecord(options) &&
        options.prefix === CHAT_EVENT_PREFIX &&
        state.remaining > 0 &&
        --state.remaining === 0
      ) {
        if (state.fail) throw new Error('Fixture history list failure.')
        state.entered.resolve()
        await state.released.promise
      }
      return Reflect.apply(target, owner, args)
    },
  })
  return {
    hold: (list: number) => {
      state.remaining = list
      state.fail = false
      state.entered = signal()
      state.released = signal()
    },
    fail: (list: number) => {
      state.remaining = list
      state.fail = true
    },
    entered: () => state.entered.promise,
    release: () => state.released.resolve(),
  }
}
