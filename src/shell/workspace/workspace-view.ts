import { loading, Store, type Loadable } from '../../app/store'
import type { WorkspaceModel } from '../../app/workspace-model'
import type { WorkspaceStore } from '../../app/workspace-store'
import type { ChatController } from '../../chat/state/controller'
import type { WorkspaceResponse } from '../../shared/workspaces'
import type { HeaderNotices } from './header-notices'
import type { ShownWorkspace } from './shown-workspaces'
import type { ToolEvents } from './tools/tool-events'
import type { WorkspaceSkills } from './workspace-skills'

/**
 * One view of a kept workspace: the store that `useWorkspaceStore` gives a
 * mounted screen. Its snapshot is the detail of the model. A failure that
 * the kept model shows is from an earlier open, so the snapshot is
 * `loading` until the open of this view ends, as at a first open.
 */
export class WorkspaceView
  implements ShownWorkspace, WorkspaceStore<Loadable<WorkspaceResponse>>
{
  readonly model: WorkspaceModel
  readonly notices: HeaderNotices
  readonly chat: ChatController
  readonly toolEvents: ToolEvents
  readonly skills: WorkspaceSkills
  private readonly start: () => boolean
  private readonly reopening: Store<boolean>

  /**
   * `start` begins the first show of the parts, once, and says whether the
   * tab still keeps them.
   */
  constructor(parts: ShownWorkspace, start: () => boolean) {
    this.model = parts.model
    this.notices = parts.notices
    this.chat = parts.chat
    this.toolEvents = parts.toolEvents
    this.skills = parts.skills
    this.start = start
    this.reopening = new Store(parts.model.detail.get().state === 'failed')
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    const stops = [
      this.model.detail.subscribe(listener),
      this.reopening.subscribe(listener),
    ]
    return () => {
      for (const stop of stops) stop()
    }
  }

  readonly getSnapshot = (): Loadable<WorkspaceResponse> =>
    this.reopening.get() ? loading : this.model.detail.get()

  /**
   * Shows the workspace in this view, after its render. The notices, the
   * tool events, and the skill lists follow the stream before the model
   * opens it, so that a first show also reads the stored history. The
   * result closes the model, ends each follow, and hides the chat. A workspace that the tab forgot never
   * opens again.
   */
  readonly connect = (): (() => void) => {
    if (!this.start()) return () => undefined
    const { model, notices, chat, toolEvents, skills } = this
    let current = true
    // Each view shows every failed repair, also one that Dismiss hid before.
    notices.newView()
    const unfollow = notices.follow(model.stream)
    const unfollowTools = toolEvents.follow(model.stream)
    const unfollowSkills = skills.follow(model.stream)
    void model.open().finally(() => {
      if (current) this.reopening.set(false)
    })
    chat.show()
    return () => {
      current = false
      model.close()
      unfollow()
      unfollowTools()
      unfollowSkills()
      chat.hide()
    }
  }
}
