import {
  showsGoToRows,
  workspaceActionIds,
  type OfferedAction,
  type PaletteOffer,
  type WorkspaceActionId,
} from '../../app/palette/page-actions'
import { useStore } from '../../app/store'
import type { ChatController } from '../../chat/state/controller'
import type { FileListKind, FilesTarget } from '../../files/navigation'
import { useOrgAccess } from '../context'
import { usePanelLayout } from '../layout/panels'
import { usePaletteOffer } from '../palette/palette-context'
import type { WorkspaceContext } from './features'
import { useFilesNavigation } from './files/files-navigation'
import { toolOffered, type ToolKey } from './tools/tool-address'
import { useToolSelect } from './tools/tool-navigation'
import { useScreenBar } from './github/WorkspaceGitHub'
import { phoneView } from './WorkspaceColumns'
import { nameLabel } from '../../shared/name-label'

/** The page shows the tabs of the right column: on desktop, while it shows. */
function useRightColumnTabs(context: WorkspaceContext): boolean {
  const rightShown = useStore(usePanelLayout().rightShown)
  return context.viewport !== 'phone' && rightShown
}

/** Where the actions of the open workspace go: under its name. */
function workspaceScope(context: WorkspaceContext): PaletteOffer['scope'] {
  const { workspace } = context
  return {
    kind: 'workspace',
    workspaceId: workspace.id,
    name: nameLabel(workspace.name),
  }
}

/**
 * Offers New terminal of the open workspace to the command palette while
 * the Terminal tool offers its +: where the page offers the Go to rows,
 * while `open` runs the +. `open` is null while the + takes no press:
 * while the sandbox does not run, at the limit of terminals, while an open
 * runs, and while the sandbox software opens only one shell. The palette
 * puts the row after the Go to rows. It draws nothing.
 */
export function useNewTerminalOffer(
  context: WorkspaceContext,
  open: (() => void) | null,
): void {
  const rightColumn = useRightColumnTabs(context)
  const offered =
    open !== null &&
    showsGoToRows({ rightColumn, workspace: context.workspace })
  usePaletteOffer(
    offered
      ? {
          scope: workspaceScope(context),
          actions: [{ id: 'new-terminal', run: open }],
        }
      : null,
  )
}

/**
 * Offers the actions of the open workspace to the command palette while
 * the screen shows it, as `workspaceActionIds` chooses them. Each action
 * does what its control on the screen does: + for New session, the clock
 * for Session history, a tab of the right column for a Go to row, the
 * Archive button, and Restore on the archived bar. The Terminal tool
 * offers New terminal through `useNewTerminalOffer`. Merge latest has no
 * control: it sends its prompt as the agent actions of the bar do. Add to
 * merge queue and Remove from queue follow the menu of the header, and
 * Remove from queue asks first. It draws nothing.
 */
export function WorkspacePaletteActions(props: {
  context: WorkspaceContext
  chat: ChatController
}) {
  const { context, chat } = props
  const access = useOrgAccess(context.org)
  const files = useFilesNavigation(context)
  const tool = useToolSelect(context)
  const rightColumn = useRightColumnTabs(context)
  const phone = context.viewport === 'phone'
  const archived = context.sandbox === 'archived'
  const bar = useScreenBar()
  const mergeLatest = bar?.mergeLatest ?? null
  const queue = bar?.queue
  const ids = workspaceActionIds({
    access,
    workspace: context.workspace,
    viewer: context.viewer,
    rightColumn,
    chat: !phone || archived || phoneView(context.view) === 'chat',
    desktopTool: toolOffered('desktop'),
    offersRestore: context.restore !== null,
    mergeLatest: mergeLatest !== null,
    queue: queue?.menu ?? null,
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
      case 'merge-latest':
        return { id, label: mergeLatest?.label, run: () => mergeLatest?.run() }
      case 'add-to-merge-queue':
        return { id, run: () => queue?.add() }
      case 'remove-from-merge-queue':
        return { id, run: () => queue?.remove() }
      case 'archive-workspace':
        return { id, run: () => context.archive?.() }
      case 'restore-workspace':
        return { id, run: () => context.restore?.() }
    }
  }
  usePaletteOffer({ scope: workspaceScope(context), actions: ids.map(action) })
  return null
}
