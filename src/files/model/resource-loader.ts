import type { FilesError, FilesResult } from '../api/files-errors'

/** The read of one file or one diff, for one path. */
export type Loaded<T> =
  | { status: 'loading'; key: string }
  | { status: 'ready'; key: string; value: T; refreshing: boolean }
  | { status: 'failed'; key: string; error: FilesError }

type Load<T> = (key: string, signal: AbortSignal) => Promise<FilesResult<T>>

/**
 * Reads one resource at a time. A newer request replaces an older one, so
 * a slow reply for a path that the user left never shows. A new version of
 * the same path keeps the old value on screen while it reads again.
 */
export class ResourceLoader<T> {
  private state: Loaded<T> | null = null
  private version: string | null = null
  private controller: AbortController | null = null
  private token = 0
  private readonly listeners = new Set<() => void>()
  private readonly load: Load<T>

  constructor(load: Load<T>) {
    this.load = load
  }

  /** Reads `key` when the key or its version changed since the last call. */
  request(key: string, version: string): void {
    if (this.state?.key === key && this.version === version) return
    this.version = version
    this.start(key)
  }

  /** Reads the current key again, as Try again does. */
  retry(): void {
    if (this.state) this.start(this.state.key)
  }

  /** Stops the read in flight. The next request reads again. */
  cancel(): void {
    this.token += 1
    this.version = null
    this.controller?.abort()
    this.controller = null
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): Loaded<T> | null => this.state

  private set(state: Loaded<T>): void {
    this.state = state
    this.listeners.forEach((listener) => listener())
  }

  private start(key: string): void {
    this.controller?.abort()
    const controller = new AbortController()
    this.controller = controller
    const token = ++this.token
    const shown = this.state
    this.set(
      shown?.key === key && shown.status === 'ready'
        ? { ...shown, refreshing: true }
        : { status: 'loading', key },
    )
    const settle = (result: FilesResult<T>) => {
      if (token !== this.token) return
      this.controller = null
      if (result.ok) {
        this.set({
          status: 'ready',
          key,
          value: result.value,
          refreshing: false,
        })
      } else if (result.error.kind !== 'aborted') {
        this.set({ status: 'failed', key, error: result.error })
      }
    }
    this.load(key, controller.signal).then(settle, () =>
      settle({
        ok: false,
        error: { kind: 'failed', status: null, code: null },
      }),
    )
  }
}
