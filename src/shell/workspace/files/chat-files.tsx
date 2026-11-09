import type { ReactNode } from 'react'
import { useNavigation } from '../../../app/navigation'
import { routes } from '../../../app/router'
import type { RenderTab, TabDraw } from '../../../chat/components/tab-row'
import type { FilesNavigation, FilesTab } from '../../../files/navigation'
import { FileTabItem, LiftedFileTab } from '../../../files/tabs/FileTabItem'
import type { WorkspaceTab } from '../../../shared/workspace-view'
import type { WorkspaceContext } from '../features'
import { useSavedView } from '../saved-view'
import { filesPlace, tabOf } from './files-address'
import { useFilesNavigation, useLeaveForSession } from './files-navigation'
import { filesTabsOf, sameFilesTab, withoutTab } from './view-tabs'

/**
 * A file or diff tab of the saved view, at the place in the tab row that
 * the chat gives it. Close of the shown tab shows the next file tab, else
 * the one before, else the chat with its session.
 */
function FileTab(props: {
  context: WorkspaceContext
  navigation: FilesNavigation
  shown: FilesTab | null
  tab: FilesTab
  draw: Extract<TabDraw, { kind: 'row' }>
}) {
  const { context, navigation, shown, tab } = props
  const go = useNavigation()
  const tabs = filesTabsOf(useSavedView(context.savedView))
  const isShown = (open: FilesTab) =>
    shown !== null && sameFilesTab(shown, open)
  const close = () => {
    const index = tabs.findIndex((open) => sameFilesTab(open, tab))
    const rest = tabs.filter((open) => !sameFilesTab(open, tab))
    const next = isShown(tab)
      ? (rest[Math.min(index, rest.length - 1)] ?? null)
      : null
    const sessionId = context.savedView.getSnapshot().activeSessionId
    const session: WorkspaceTab | null = sessionId
      ? { kind: 'session', sessionId }
      : null
    context.savedView.updateView((view) =>
      withoutTab(view, tab, next ?? session),
    )
    if (!isShown(tab)) return
    go.push(
      next
        ? navigation.href(next)
        : routes.workspace(context.org.id, context.workspace.id),
    )
  }
  return (
    <FileTabItem
      close={props.draw.close}
      item={props.draw.item}
      link={props.draw.link}
      navigation={navigation}
      onClose={close}
      selected={isShown(tab)}
      tab={tab}
    />
  )
}

/** What the kept chat gets from the Files screens. */
export interface ChatFiles {
  renderTab?: RenderTab
  onOpenDiff?: (path: string) => void
}

/**
 * The file parts of the kept chat: on desktop, the file and diff tabs at
 * their places in the tab row, with the copy that a drag lifts, and the
 * diff that a file of a finished turn opens. When the chat makes a session
 * active while `content` shows a file, the address goes back to the chat.
 * An archived workspace has no files.
 */
export function useChatFiles(
  context: WorkspaceContext,
  content: ReactNode,
): ChatFiles {
  const navigation = useFilesNavigation(context)
  const shown = content === null ? null : tabOf(filesPlace(context.view))
  useLeaveForSession(context, shown !== null)
  if (context.sandbox === 'archived') return {}
  return {
    renderTab:
      context.viewport === 'phone'
        ? undefined
        : (tab, draw) =>
            draw.kind === 'lifted' ? (
              <LiftedFileTab tab={tab} />
            ) : (
              <FileTab
                context={context}
                draw={draw}
                navigation={navigation}
                shown={shown}
                tab={tab}
              />
            ),
    onOpenDiff: (path) => navigation.navigate({ kind: 'diff', path }),
  }
}
