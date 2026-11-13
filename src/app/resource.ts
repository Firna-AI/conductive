import type { ApiError } from './api/client'
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

export interface ResourceOptions {
  /**
   * Whether the error of a failed read proves that the value no longer
   * exists, such as the refusal of a deleted record. Such a read shows its
   * error also in place of a value that shows, unless a newer answer shows.
   * Every other failed read keeps that value. Without it, each failed read
   * keeps the value.
   */
  missing?: (error: ApiError) => boolean
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
 * - The writes and saves of one value go out one at a time, each after the
 *   answer of the one before. So the server gets them in the order that
 *   they showed, and two changes of one field cannot cross on the way. A
 *   failed write or save does not stop the next one.
 * - A failed read keeps a value that already shows. Only a read that fails
 *   before any answer shows its error. A value can name the errors that
 *   prove that it no longer exists, through `missing`: such a read shows its
 *   error also over a value, and an older answer no longer shows.
 */
export class Resource<T> {
  private readonly shown = new Store<Loadable<T>>(loading)
  readonly store: Readable<Loadable<T>> = this.shown
  private answer: Loadable<T> = loading
  private answerAt = 0
  private count = 0
  private confirmed: Layer<T>[] = []
  private writes: Layer<T>[] = []
  /** The last write or save in the queue. It never fails, so the next can go. */
  private sending: Promise<unknown> = Promise.resolve()
  private readonly fetch: () => Promise<T>
  private readonly missing: (error: ApiError) => boolean

  constructor(fetch: () => Promise<T>, options: ResourceOptions = {}) {
    this.fetch = fetch
    this.missing = options.missing ?? (() => false)
  }

  /** Reads the value. `current` returns false when its answer is obsolete. */
  async read(current: () => boolean = () => true): Promise<void> {
    const startedAt = ++this.count
    let value: T
    try {
      value = await this.fetch()
    } catch (error) {
      if (current()) this.failed(asApiError(error), startedAt)
      return
    }
    if (current()) this.answered(value, startedAt)
  }

  /**
   * Sends a write whose answer is the whole value, after every earlier save
   * of this value has its answer, and shows the answer. A failure rejects
   * only its own caller.
   */
  save(send: () => Promise<T>): Promise<T> {
    return this.queued(async () => {
      const value = await send()
      this.answered(value, ++this.count)
      return value
    })
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
   * Shows `change` at once, and sends it after every earlier write and save
   * of this value has its answer. A success keeps `commit` of the answer
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
      const answer = await this.queued(send)
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

  /** Runs `send` after the write or save before it, also a failed one. */
  private queued<A>(send: () => Promise<A>): Promise<A> {
    const run = this.sending.then(send)
    this.sending = run.catch(() => undefined)
    return run
  }

  /**
   * A read that started at the count `at` failed. It keeps a value that
   * shows, unless its error proves that the value no longer exists. Then it
   * counts as the newest answer, unless a newer answer shows.
   */
  private failed(error: ApiError, at: number): void {
    if (this.missing(error)) {
      if (at < this.answerAt) return
      this.answerAt = at
    } else if (this.answer.state === 'ready') return
    this.answer = { state: 'failed', error }
    this.show()
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
