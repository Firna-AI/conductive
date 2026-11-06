import { useSyncExternalStore } from 'react'
import { ApiError } from './api/client'

/** A value that screens read and follow. Only its owner changes it. */
export interface Readable<T> {
  get: () => T
  subscribe: (listener: () => void) => () => void
}

/**
 * One value that screens read and models change. Screens subscribe through
 * `useStore`, so a change draws every screen that shows the value.
 */
export class Store<T> implements Readable<T> {
  private value: T
  private readonly listeners = new Set<() => void>()

  constructor(initial: T) {
    this.value = initial
  }

  get = (): T => this.value

  set(value: T): void {
    if (Object.is(value, this.value)) return
    this.value = value
    for (const listener of [...this.listeners]) listener()
  }

  change(next: (current: T) => T): void {
    this.set(next(this.value))
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

export function useStore<T>(store: Readable<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

/** Data that loads from the API: loading, ready, or failed with its error. */
export type Loadable<T> =
  | { state: 'loading' }
  | { state: 'ready'; value: T }
  | { state: 'failed'; error: ApiError }

export const loading = { state: 'loading' } as const

export function ready<T>(value: T): Loadable<T> {
  return { state: 'ready', value }
}

export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  return new ApiError(0, 'unexpected', 'Something went wrong. Try again.')
}

/** Loads a value into a store, and keeps the error when the load fails. */
export async function load<T>(
  store: Store<Loadable<T>>,
  request: () => Promise<T>,
): Promise<void> {
  try {
    store.set(ready(await request()))
  } catch (error) {
    store.set({ state: 'failed', error: asApiError(error) })
  }
}

/** The value of a loaded store, or `undefined` while it loads or failed. */
export function valueOf<T>(loadable: Loadable<T>): T | undefined {
  return loadable.state === 'ready' ? loadable.value : undefined
}

/** Changes a loaded value in place. A store that has no value stays as it is. */
export function patch<T>(
  store: Store<Loadable<T>>,
  change: (value: T) => T,
): void {
  store.change((current) =>
    current.state === 'ready' ? ready(change(current.value)) : current,
  )
}
