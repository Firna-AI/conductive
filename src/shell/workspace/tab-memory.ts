import type { AppModel } from '../../app/app-model'
import type { User } from '../../shared/api'
import { ShownWorkspaces } from './shown-workspaces'

/** The memory of one tab: the shown workspaces of its signed-in user. */
class TabMemory {
  private readonly app: AppModel
  private current: ShownWorkspaces | null = null
  /** The memory of another user, until a workspace of it shows. */
  private next: ShownWorkspaces | null = null
  private following = false

  constructor(app: AppModel) {
    this.app = app
  }

  private get userId(): string | null {
    return this.current?.userId ?? null
  }

  /**
   * The memory of `user`. Another user gets a new memory. It replaces the
   * current one at its first show, after the render, so that a render stops
   * no kept workspace.
   */
  forUser(user: User): ShownWorkspaces {
    if (this.current?.userId === user.id) return this.current
    if (this.next?.userId === user.id) return this.next
    const next: ShownWorkspaces = new ShownWorkspaces(this.app, user.id, () =>
      this.shown(next),
    )
    this.next = next
    return next
  }

  /**
   * The first show of a workspace of `memory`. A new memory replaces the
   * current one, which stops. It says whether `memory` is the memory of the
   * tab, because a memory that the tab dropped shows nothing.
   */
  private shown(memory: ShownWorkspaces): boolean {
    if (memory === this.next) {
      this.current?.clear()
      this.current = memory
      this.next = null
    }
    this.follow()
    return memory === this.current
  }

  /**
   * Follows the sign-in from the first show on, because a render can make
   * the memory and never show it. Until then the memory keeps only parts
   * that no screen showed, with no data in them. The memory lives as long
   * as the app model, so it never unsubscribes.
   */
  private follow(): void {
    if (this.following) return
    this.following = true
    const { app } = this
    app.boot.subscribe(() => {
      const boot = app.boot.get()
      const signedOut = boot.state === 'signed-out'
      const other = boot.state === 'ready' && boot.user.id !== this.userId
      if (signedOut || other) this.clear()
    })
  }

  private clear(): void {
    this.current?.clear()
    this.current = null
    this.next?.clear()
    this.next = null
  }
}

const tabs = new WeakMap<AppModel, TabMemory>()

/**
 * The shown workspaces of the tab of `app`, for the signed-in `user`. The
 * memory belongs to the app model of the tab. A sign-out, or a sign-in of
 * another user, stops and forgets every workspace in it. A call starts no
 * read and no subscription, and stops nothing, so that a render can call it.
 */
export function shownWorkspaces(app: AppModel, user: User): ShownWorkspaces {
  let memory = tabs.get(app)
  if (!memory) {
    memory = new TabMemory(app)
    tabs.set(app, memory)
  }
  return memory.forUser(user)
}
