import {
  workspaceActionIds,
  type OfferedAction,
  type WorkspaceActionId,
} from '../../app/palette/page-actions'
import type { ChatController } from '../../chat/state/controller'
import type { FileListKind, FilesTarget } from '../../files/navigation'
import { useOrgAccess } from '../context'
import { usePaletteOffer } from '../palette/palette-context'
import type { WorkspaceContext } from './features'
import { useFilesNavigation } from './files/files-navigation'
import type { ToolKey } from './tools/tool-address'
import { useToolSelect } from './tools/tool-navigation'
import { phoneView } from './WorkspaceColumns'

/**
 * Offers the actions of the open workspace to the command palette while
 * the screen shows it, as `workspaceActionIds` chooses them. Each action
 * does what its control on the screen does: + for New session, the clock
 * for Session history, a tab of the right column for a Go to row, and the
 * Archive button. It draws nothing.
 */
export function WorkspacePaletteActions(props: {
  context: WorkspaceContext
  chat: ChatController
}) {
  const { context, chat } = props
  const access = useOrgAccess(context.org)
  const files = useFilesNavigation(context)
  const tool = useToolSelect(context)
  const phone = context.viewport === 'phone'
  const archived = context.sandbox === 'archived'
  const ids = workspaceActionIds({
    access,
    workspace: context.workspace,
    viewer: context.viewer,
    rightColumn: !phone,
    chat: !phone || archived || phoneView(context.view) === 'chat',
  })
  const list = (id: WorkspaceActionId, kind: FileListKind): OfferedAction => {
    const target: FilesTarget = { kind: 'list', list: kind }
    return { id, href: files.href(target), run: () => files.navigate(target) }
  }
  const toolTab = (id: WorkspaceActionId, key: ToolKey): OfferedAction => ({
    id,
    href: tool.href(key),
    run: () => tool.select(key),
  })
  const action = (id: WorkspaceActionId): OfferedAction => {
    switch (id) {
      case 'new-session':
        return { id, run: () => void chat.newSession() }
      case 'session-history':
        return { id, run: () => chat.showHistory(true) }
      case 'go-to-all-files':
        return list(id, 'all')
      case 'go-to-changes':
        return list(id, 'changes')
      case 'go-to-checks':
        return list(id, 'checks')
      case 'go-to-terminal':
        return toolTab(id, 'terminal')
      case 'go-to-preview':
        return toolTab(id, 'preview')
      case 'go-to-desktop':
        return toolTab(id, 'desktop')
      case 'archive-workspace':
        return { id, run: () => context.archive?.() }
    }
  }
  usePaletteOffer({
    scope: {
      kind: 'workspace',
      workspaceId: context.workspace.id,
      name: context.workspace.name,
    },
    actions: ids.map(action),
  })
  return null
}
