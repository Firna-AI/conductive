import { asApiError, loading, ready, Store } from './store'
import type { Loadable, Readable } from './store'

/** A change of a value: the next value from the current one. */
export type Change<T> = (value: T) => T

/** No change, such as of a write that shows only its answer. */
export function same<T>(value: T): T {
  return value
}

interface Layer<T> {
  change: Change<T>
  /** The count when the change arrived, or `null` while its write waits. */
  at: number | null
  key?: string
}

/**
 * A value that the server owns, as a screen shows it: the answer of the
 * newest read, then the changes that the server confirmed after that read
 * started, then the writes in the order that they went out.
 *
 * - Each read, change, and write answer counts one up. An answer ends each
 *   change that arrived before its read started, because the server had
 *   that change when it answered. An answer older than the shown answer
 *   changes nothing.
 * - A write shows its change at once. Its answer turns the change into the
 *   fields that the answer confirms. A failed write takes back its own
 *   change only, so other writes, changes, and reads stay.
 * - A save is a write whose answer is the whole value. Its answer counts
 *   as an answer from the time that it arrives.
 * - A failed read keeps a value that already shows. Only a read that fails
 *   before any answer shows its error.
 */
export class Resource<T> {
  private readonly shown = new Store<Loadable<T>>(loading)
  readonly store: Readable<Loadable<T>> = this.shown
  private answer: Loadable<T> = loading
  private answerAt = 0
  private count = 0
  private confirmed: Layer<T>[] = []
  private writes: Layer<T>[] = []
  private readonly fetch: () => Promise<T>

  constructor(fetch: () => Promise<T>) {
    this.fetch = fetch
  }

  /** Reads the value. `current` returns false when its answer is obsolete. */
  async read(current: () => boolean = () => true): Promise<void> {
    const startedAt = ++this.count
    let value: T
    try {
      value = await this.fetch()
    } catch (error) {
      if (!current() || this.answer.state === 'ready') return
      this.answer = { state: 'failed', error: asApiError(error) }
      this.show()
      return
    }
    if (current()) this.answered(value, startedAt)
  }

  /** Sends a write whose answer is the whole value, and shows the answer. */
  async save(send: () => Promise<T>): Promise<T> {
    const value = await send()
    this.answered(value, ++this.count)
    return value
  }

  /**
   * A change that the server made, such as an event. It stays until a read
   * that starts after it answers. A change with the same key replaces it.
   */
  confirm(change: Change<T>, key?: string): void {
    const kept =
      key === undefined
        ? this.confirmed
        : this.confirmed.filter((layer) => layer.key !== key)
    this.confirmed = [...kept, { change, at: ++this.count, key }]
    this.show()
  }

  /**
   * Shows `change` while `send` runs. A success keeps `commit` of the answer
   * until a newer read. A failure takes back the change, and throws.
   */
  async write<A>(
    change: Change<T>,
    send: () => Promise<A>,
    commit: (answer: A) => Change<T>,
  ): Promise<A> {
    const write: Layer<T> = { change, at: null }
    this.writes = [...this.writes, write]
    this.show()
    try {
      const answer = await send()
      write.change = commit(answer)
      write.at = ++this.count
      return answer
    } catch (error) {
      this.writes = this.writes.filter((layer) => layer !== write)
      throw error
    } finally {
      this.show()
    }
  }

  /** The server had `value` at the count `at`, and every change before. */
  private answered(value: T, at: number): void {
    if (at < this.answerAt) return
    this.answer = ready(value)
    this.answerAt = at
    const newer = (layer: Layer<T>) => layer.at === null || layer.at > at
    this.confirmed = this.confirmed.filter(newer)
    this.writes = this.writes.filter(newer)
    this.show()
  }

  private show(): void {
    const answer = this.answer
    if (answer.state !== 'ready') {
      this.shown.set(answer)
      return
    }
    const apply = (value: T, layer: Layer<T>) => layer.change(value)
    const confirmed = this.confirmed.reduce(apply, answer.value)
    this.shown.set(ready(this.writes.reduce(apply, confirmed)))
  }
}
