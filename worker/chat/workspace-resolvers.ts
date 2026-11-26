import type { ChatDependencies } from './types'
import type { WorkspaceCallbackObservers } from './workspace-callbacks'

export type WorkspaceChatResolvers = Partial<
  Pick<
    ChatDependencies,
    | 'resolveAttachments'
    | 'prepareAttachments'
    | 'scheduleRunnerCheck'
    | 'scheduleBrowserCheck'
    | 'randomId'
    | 'runTitleModel'
    | 'readConnectionAccess'
    | 'readRunnerAccess'
    | 'browserOpened'
    | 'browserClosed'
  >
> & {
  callbackObservers?: WorkspaceCallbackObservers
  socketAutoResponseAt?: (socket: WebSocket) => number | null
}
