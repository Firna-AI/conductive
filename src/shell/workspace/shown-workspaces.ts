import type { AppModel } from '../../app/app-model'
import { failedCreate } from '../../app/creations'
import type { OrgModel } from '../../app/org-model'
import { valueOf } from '../../app/store'
import { WorkspaceModel } from '../../app/workspace-model'
import { ChatController } from '../../chat/state/controller'
import type { ChatSources } from '../../chat/state/sources'
import type { SubscribeToWorkspace } from '../../chat/stream/workspace-stream'
import type { User } from '../../shared/api'
import { HeaderNotices } from './header-notices'

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
  /** End the subscriptions of the kept parts to each other and to the org. */
  readonly stops: readonly (() => void)[]
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
  private readonly subscribe: SubscribeToWorkspace
  private readonly kept = new Map<string, KeptWorkspace>()

  constructor(app: AppModel, userId: string) {
    this.app = app
    this.userId = userId
    const { events } = app.services
    // The chat opens the event socket of the app, as the model does.
    this.subscribe = (target, afterEventNumber, listener) =>
      events.open({ ...target, afterEventNumber }, listener)
  }

  /** The kept parts of a workspace. Its first show makes them. */
  get(orgId: string, workspaceId: string): ShownWorkspace {
    const key = `${orgId}/${workspaceId}`
    const known = this.kept.get(key)
    if (known) return known
    const { services } = this.app
    const org = this.app.org(orgId)
    const model = new WorkspaceModel(org, workspaceId)
    const notices = new HeaderNotices()
    // The chat names the members of the org. A first show reads them when
    // no screen did, and a return reads them never again.
    if (org.members.get().state !== 'ready') void org.reload('members')
    const { creations } = org
    const failed = creations.of(workspaceId)
    const shown: KeptWorkspace = {
      model,
      notices,
      stops: [
        // The notices follow the stream before its first open, so that they
        // also read the stored history.
        notices.follow(model.stream),
        // The creates of this tab read the same events, so a failed start
        // turns into its form in the same render as the error state.
        model.stream.subscribe((envelope) =>
          creations.observe(workspaceId, envelope),
        ),
        model.detail.subscribe(() => this.removal(key, org, model)),
        failed.subscribe(() => {
          if (failed.get()?.state === 'failed') this.forget(key)
        }),
      ],
      chat: new ChatController({
        target: { orgId, workspaceId },
        // The client of the org takes each `org_suspended` refusal of the
        // chat, so a page with an old org list turns read-only at once.
        client: org.services.api,
        subscribe: this.subscribe,
        newId: services.newId,
        sources: chatSources(this.app, org),
        readOnly: () => org.suspension.suspended.get(),
      }),
    }
    this.kept.set(key, shown)
    return shown
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

  constructor(app: AppModel) {
    this.app = app
    // The memory lives as long as the app model, so it never unsubscribes.
    app.boot.subscribe(() => {
      const boot = app.boot.get()
      const signedOut = boot.state === 'signed-out'
      const other = boot.state === 'ready' && boot.user.id !== this.userId
      if (signedOut || other) this.clear()
    })
  }

  private get userId(): string | null {
    return this.current?.userId ?? null
  }

  forUser(user: User): ShownWorkspaces {
    if (this.current?.userId === user.id) return this.current
    this.clear()
    this.current = new ShownWorkspaces(this.app, user.id)
    return this.current
  }

  private clear(): void {
    this.current?.clear()
    this.current = null
  }
}

const tabs = new WeakMap<AppModel, TabMemory>()

/**
 * The shown workspaces of the tab of `app`, for the signed-in `user`. The
 * memory belongs to the app model of the tab. A sign-out, or a sign-in of
 * another user, stops and forgets every workspace in it.
 */
export function shownWorkspaces(app: AppModel, user: User): ShownWorkspaces {
  let memory = tabs.get(app)
  if (!memory) {
    memory = new TabMemory(app)
    tabs.set(app, memory)
  }
  return memory.forUser(user)
}
