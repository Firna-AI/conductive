import type { Delay } from '../app/events'
import type { Readable } from '../app/store'

/**
 * The wait before the next backup read of an open workspace, in ms. GitHub
 * events keep the state current, so these reads only catch a change that no
 * webhook names. Each read costs GitHub API calls in every open tab, so the
 * wait is long. It is a choice of the app, not a product limit.
 */
const backupReadWait = 300_000

/**
 * The timer of the backup reads of one connection of a GitHub store. The
 * store starts the wait when a read ends, and stops it when a read starts.
 * A wait that ends while the page is hidden runs no read. The read is then
 * due, and it runs when the page shows again. So a hidden page costs no
 * GitHub reads, and a return to the page reads only when a read is due.
 */
export class BackupReads {
  private readonly delay: Delay
  private readonly visible: Readable<boolean>
  private readonly read: () => Promise<void>
  private readonly unwatch: () => void
  /** Cancels the wait, while one runs. */
  private cancelWait: (() => void) | null = null
  /** A wait ended while the page was hidden, so a read is due. */
  private due = false

  constructor(
    delay: Delay,
    visible: Readable<boolean>,
    read: () => Promise<void>,
  ) {
    this.delay = delay
    this.visible = visible
    this.read = read
    this.unwatch = visible.subscribe(this.shown)
  }

  /** Starts the wait, unless one runs or a read is due. */
  start(): void {
    if (this.cancelWait || this.due) return
    this.cancelWait = this.delay(backupReadWait, this.end)
  }

  /** Stops the wait and drops a due read, because a read starts. */
  stop(): void {
    this.cancelWait?.()
    this.cancelWait = null
    this.due = false
  }

  /** Stops the wait and stops following the page, at disconnect. */
  close(): void {
    this.stop()
    this.unwatch()
  }

  private readonly end = (): Promise<void> => {
    this.cancelWait = null
    if (this.visible.get()) return this.read()
    this.due = true
    return Promise.resolve()
  }

  private readonly shown = (): void => {
    if (!this.due || !this.visible.get()) return
    this.due = false
    void this.read()
  }
}
