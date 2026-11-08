import type { WorkspaceResponse } from '../shared/workspaces'
import { ignore } from './api/parse'
import type { AppServices } from './services'
import { valueOf, type Loadable, type Readable } from './store'

interface ReadMarkView {
  detail: Readable<Loadable<WorkspaceResponse>>
  last: Readable<number>
  /** A suspended org refuses each write, so it gets no read mark. */
  suspended: Readable<boolean>
  clearUnread: () => void
}

const nextMarkWait = 250
const retryWait = 1_000

/** Keeps shown output pending until the Worker confirms its read mark. */
export class WorkspaceReadMarks {
  private readonly services: AppServices
  private readonly path: string
  private readonly view: ReadMarkView
  private shown = 0
  private confirmed = 0
  private reading = false
  private queued = false
  private opened = false
  private archived = false
  private cancelTimer: (() => void) | null = null
  private readonly stops: (() => void)[] = []

  constructor(services: AppServices, path: string, view: ReadMarkView) {
    this.services = services
    this.path = path
    this.view = view
  }

  open(): void {
    if (this.opened) return
    this.opened = true
    this.archived =
      valueOf(this.view.detail.get())?.workspace.state === 'archived'
    const check = () => this.check()
    this.stops.push(
      this.view.detail.subscribe(check),
      this.view.last.subscribe(check),
      this.view.suspended.subscribe(check),
      this.services.visible.subscribe(check),
    )
    this.check()
  }

  /** Retains the numbers and the request, but stops all work for this visit. */
  close(): void {
    this.opened = false
    this.clearTimer()
    for (const stop of this.stops.splice(0)) stop()
  }

  private follow(): boolean {
    const detail = valueOf(this.view.detail.get())
    // Old history can show pre-archive records after an archived HTTP detail.
    if (detail?.workspace.state === 'archived') this.archived = true
    if (
      !this.opened ||
      !detail ||
      this.archived ||
      this.view.suspended.get() ||
      !this.services.visible.get()
    ) {
      this.clearTimer()
      return false
    }
    this.shown = Math.max(this.shown, this.view.last.get())
    return true
  }

  private check(): void {
    if (!this.follow()) return
    if (this.shown <= this.confirmed) {
      if (this.shown > 0) this.view.clearUnread()
      return
    }
    if (this.reading || this.cancelTimer || this.queued) return
    this.queued = true
    // The stream raises its number before it applies the event, including Archive.
    void Promise.resolve().then(() => {
      this.queued = false
      return this.send()
    })
  }

  private async send(): Promise<void> {
    if (!this.follow() || this.reading || this.cancelTimer) return
    if (this.shown <= this.confirmed) return
    const through = this.shown
    this.reading = true
    let succeeded = false
    try {
      await this.services.api.send(
        'PUT',
        this.path,
        { throughEventNumber: through },
        ignore,
      )
      this.confirmed = through
      succeeded = true
    } catch {
      // A failed mark remains pending, also after a later close and open.
    } finally {
      this.reading = false
    }
    if (!this.follow()) return
    if (this.confirmed >= this.shown) {
      this.view.clearUnread()
      return
    }
    this.cancelTimer = this.services.delay(
      succeeded ? nextMarkWait : retryWait,
      () => {
        this.cancelTimer = null
        return this.send()
      },
    )
  }

  private clearTimer(): void {
    this.cancelTimer?.()
    this.cancelTimer = null
  }
}
