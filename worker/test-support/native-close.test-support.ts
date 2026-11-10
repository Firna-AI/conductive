function signal() {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const UNLISTED = '__test:native-close:unlisted'

/** Native event completion stays observable when the cleanup under test is disabled. */
export class NativeCloseProbe {
  private first: 'fetch' | 'close' | null = null
  private completed = 0
  private errors = 0
  private active = 0
  private omitted = 0
  private readonly omittedIds: string[] = []
  private readonly storage: DurableObjectStorage
  private readonly unlisted: boolean
  private changed = signal()
  private readonly pending: Promise<unknown>[] = []

  constructor(context: DurableObjectState) {
    this.storage = context.storage
    this.unlisted = context.storage.kv.get<boolean>(UNLISTED) === true
    const getWebSockets = context.getWebSockets.bind(context)
    let constructorListing = true
    context.getWebSockets = (tag) => {
      const sockets = getWebSockets(tag)
      if (constructorListing) {
        constructorListing = false
        if (this.unlisted) {
          // Model only the constructor listing. The real native close still delivers its socket.
          this.omitted = sockets.length
          for (const socket of sockets) {
            const state: unknown = socket.deserializeAttachment()
            if (
              !state ||
              typeof state !== 'object' ||
              !('id' in state) ||
              typeof state.id !== 'string'
            )
              throw new Error('The native fixture socket identity is missing.')
            this.omittedIds.push(state.id)
          }
          return []
        }
      }
      return sockets
    }
    const waitUntil = context.waitUntil.bind(context)
    context.waitUntil = (work) => {
      if (this.active) this.pending.push(work)
      waitUntil(work)
    }
  }

  fetch(): void {
    this.first ??= 'fetch'
  }

  prepare(): Promise<void> {
    return this.storage.put(UNLISTED, true)
  }

  async close(work: () => Promise<void>): Promise<void> {
    this.first ??= 'close'
    this.active++
    try {
      await work()
      while (this.pending.length) await Promise.all(this.pending.splice(0))
    } catch (error) {
      this.errors++
      throw error
    } finally {
      if (this.unlisted) await this.storage.delete(UNLISTED)
      this.active--
      this.completed++
      this.changed.resolve()
      this.changed = signal()
    }
  }

  async wait(count = 1): Promise<void> {
    while (this.completed < count) await this.changed.promise
  }

  snapshot() {
    return {
      first: this.first,
      completed: this.completed,
      errors: this.errors,
      omitted: this.omitted,
      omittedIds: this.omittedIds,
    }
  }
}
