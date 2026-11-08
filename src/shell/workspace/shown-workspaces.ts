import type { AppModel } from '../../app/app-model'
import { failedCreate } from '../../app/creations'
import type { OrgModel } from '../../app/org-model'
import { valueOf } from '../../app/store'
import { WorkspaceModel } from '../../app/workspace-model'
import type { WorkspaceIdentity } from '../../app/workspace-store'
import { ChatController } from '../../chat/state/controller'
import type { ChatSources } from '../../chat/state/sources'
import type { SubscribeToWorkspace } from '../../chat/stream/workspace-stream'
import type { WorkspaceFiles } from '../../files/model/files-store'
import { createWorkspaceFiles } from './files/files-store'
import { HeaderNotices } from './header-notices'
import { ToolEvents } from './tools/tool-events'
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
  /** The events that the tools read, with the revokes that they keep. */
  readonly toolEvents: ToolEvents
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
  /** The kept files of each workspace, made when a Files part first shows. */
  private readonly keptFiles = new Map<string, WorkspaceFiles>()

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
      toolEvents: new ToolEvents(),
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

  /**
   * The kept files of a workspace. The first call makes the store, which
   * starts nothing. The Files part connects it while it shows, so a return
   * shows the lists at once and reads only the events after the last one.
   * It reads through the client of the org, which takes each
   * `org_suspended` refusal.
   */
  files(orgId: string, workspaceId: string): WorkspaceFiles {
    const key = `${orgId}/${workspaceId}`
    const known = this.keptFiles.get(key)
    if (known) return known
    const files = createWorkspaceFiles(this.app.org(orgId).services, {
      orgId,
      workspaceId,
    })
    this.keptFiles.set(key, files)
    return files
  }

  /** Stops every kept workspace and forgets it, as at a sign-out. */
  clear(): void {
    for (const shown of this.kept.values()) stop(shown)
    this.kept.clear()
    for (const files of this.keptFiles.values()) files.stop()
    this.keptFiles.clear()
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
    this.keptFiles.get(key)?.stop()
    this.keptFiles.delete(key)
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
