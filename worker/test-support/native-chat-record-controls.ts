import type { WorkspaceEvent } from '../../src/shared/events'
import type { WorkspaceChat } from '../chat/backend'
import type { WorkspaceFiles } from '../files/workspace'

export function nativeChatRecordControls(
  chat: WorkspaceChat,
  files: WorkspaceFiles,
) {
  return {
    history: (workspaceId: string, after = 0, through?: number) =>
      chat.readWorkspace(workspaceId, (view) => view.history(after, through)),
    fileProjection: (kind: 'tree' | 'changes') =>
      kind === 'tree' ? files.tree() : files.changes(),
    emitEvent: (workspaceId: string, event: WorkspaceEvent) =>
      chat.changeWorkspace(workspaceId, (view) => view.emit(event)),
  }
}
