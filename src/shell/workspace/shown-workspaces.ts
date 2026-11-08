import type { AppModel } from '../../app/app-model'
import { failedCreate } from '../../app/creations'
import type { OrgModel } from '../../app/org-model'
import { valueOf } from '../../app/store'
import { WorkspaceModel } from '../../app/workspace-model'
import type { WorkspaceIdentity } from '../../app/workspace-store'
import { ChatController } from '../../chat/state/controller'
import type { ChatSources } from '../../chat/state/sources'
import type { SubscribeToWorkspace } from '../../chat/stream/workspace-stream'
import type { User } from '../../shared/api'
import { HeaderNotices } from './header-notices'
import { WorkspaceView } from './workspace-view'

/**
 * A workspace that the tab showed: its model, the failed repairs under its
 * header, and its chat. The stream of the model and the stream of the chat
 * each keep their last event number while the tab shows another page.
 */
export interface ShownWorkspace {
  readonly model: WorkspaceModel
  readonly notices: HeaderNotices
  readonly chat: ChatController
}

interface KeptWorkspace extends ShownWorkspace {
  readonly org: OrgModel
  /** Whether a screen showed it, so that its first show started the observers. */
  started: boolean
  /** End the subscriptions of the kept parts to each other and to the org. */
  readonly stops: (() => void)[]
}

/**
 * The inputs of a kept chat from the app models that own them: the account,
 * the org, the models, and the members. So a login that the account screen
 * saves, or a new default model, shows in the kept chat at once.
 */
function chatSources(app: AppModel, org: OrgModel): ChatSources {
  return {
    account: app.account.account,
    models: app.models,
    org: {
      get: () => app.orgs.get().find((item) => item.id === org.orgId) ?? null,
      subscribe: app.orgs.subscribe,
    },
    members: {
      get: () => valueOf(org.members.get()) ?? null,
      subscribe: org.members.subscribe,
    },
  }
}

/**
 * The workspaces that one tab showed for one signed-in user. A return to a
 * workspace shows its header, its notices, and its chat at once, and each of
 * its streams asks only for the events after its own last event number. It
 * keeps nothing in browser storage, so a reload or a new tab starts empty.
 */
export class ShownWorkspaces {
  readonly userId: string
  private readonly app: AppModel
  private readonly onShow: () => boolean
  private readonly subscribe: SubscribeToWorkspace
  private readonly kept = new Map<string, KeptWorkspace>()

  /**
   * `onShow` runs at the first show of each workspace, after its render. It
   * says whether the tab still keeps this memory.
   */
  constructor(app: AppModel, userId: string, onShow: () => boolean) {
    this.app = app
    this.userId = userId
    this.onShow = onShow
    const { events } = app.services
    // The chat opens the event socket of the app, as the model does.
    this.subscribe = (target, afterEventNumber, listener) =>
      events.open({ ...target, afterEventNumber }, listener)
  }

  /**
   * A view of the kept parts of a workspace, for the `create` of
   * `useWorkspaceStore`. The first view makes the parts. It starts no read
   * and no subscription: the first connect of a view does.
   */
  view(workspace: WorkspaceIdentity): WorkspaceView {
    const key = `${workspace.orgId}/${workspace.workspaceId}`
    const shown = this.kept.get(key) ?? this.keep(key, workspace)
    return new WorkspaceView(shown, () => this.start(key, shown))
  }

  private keep(key: string, workspace: WorkspaceIdentity): KeptWorkspace {
    const { orgId, workspaceId } = workspace
    const { services } = this.app
    const org = this.app.org(orgId)
    const shown: KeptWorkspace = {
      model: new WorkspaceModel(org, workspaceId),
      notices: new HeaderNotices(),
      chat: new ChatController({
        target: { orgId, workspaceId },
        client: services.api,
        subscribe: this.subscribe,
        newId: services.newId,
        sources: chatSources(this.app, org),
      }),
      org,
      started: false,
      stops: [],
    }
    this.kept.set(key, shown)
    return shown
  }

  /**
   * The first show of a kept workspace. It says whether the tab still keeps
   * the workspace, and starts the observers that end when the tab forgets
   * it. Later shows start nothing more.
   */
  private start(key: string, shown: KeptWorkspace): boolean {
    if (this.kept.get(key) !== shown) return false
    if (shown.started) return true
    if (!this.onShow()) return false
    shown.started = true
    const { model, org } = shown
    const { workspaceId } = model
    // The chat names the members of the org. A first show reads them when
    // no screen did, and a return reads them never again.
    if (org.members.get().state !== 'ready') void org.reload('members')
    const { creations } = org
    const failed = creations.of(workspaceId)
    shown.stops.push(
      // The creates of this tab read the same events, so a failed start
      // turns into its form in the same render as the error state.
      model.stream.subscribe((envelope) =>
        creations.observe(workspaceId, envelope),
      ),
      model.detail.subscribe(() => this.removal(key, org, model)),
      failed.subscribe(() => {
        if (failed.get()?.state === 'failed') this.forget(key)
      }),
    )
    return true
  }

  /** Stops every kept workspace and forgets it, as at a sign-out. */
  clear(): void {
    for (const shown of this.kept.values()) stop(shown)
    this.kept.clear()
  }

  /**
   * The server removes a create whose sandbox did not start. A 404 of its
   * open tells the creates of this tab. An error state of its create start
   * takes it out of the list, and forgets its kept parts, also in a tab
   * that did not create it.
   */
  private removal(key: string, org: OrgModel, model: WorkspaceModel): void {
    const detail = model.detail.get()
    if (detail.state === 'failed' && detail.error.status === 404) {
      org.creations.removed(model.workspaceId)
    }
    if (detail.state === 'ready' && failedCreate(detail.value)) {
      org.removeWorkspace(model.workspaceId)
      this.forget(key)
    }
  }

  /** Stops a kept workspace for good, so that its streams never open again. */
  private forget(key: string): void {
    const shown = this.kept.get(key)
    if (!shown) return
    this.kept.delete(key)
    stop(shown)
  }
}

function stop(shown: KeptWorkspace): void {
  shown.model.close()
  for (const end of shown.stops) end()
  shown.chat.stop()
}

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
