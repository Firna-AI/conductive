import type { ReactNode } from 'react'
import { useNavigation } from '../../../app/navigation'
import { routes } from '../../../app/router'
import type { FilesNavigation, FilesTab } from '../../../files/navigation'
import { FileTabItem } from '../../../files/tabs/FileTabItem'
import type { WorkspaceTab } from '../../../shared/workspace-view'
import type { WorkspaceContext } from '../features'
import { useSavedView } from '../saved-view'
import { filesPlace, tabOf } from './files-address'
import { useFilesNavigation, useLeaveForSession } from './files-navigation'
import { filesTabsOf, sameFilesTab, withoutTab } from './view-tabs'

/**
 * The file and diff tabs of the saved view, after the session tabs. Close
 * of the shown tab shows the next file tab, else the one before, else the
 * chat with its session.
 */
function FileTabs(props: {
  context: WorkspaceContext
  navigation: FilesNavigation
  shown: FilesTab | null
}) {
  const { context, navigation, shown } = props
  const go = useNavigation()
  const tabs = filesTabsOf(useSavedView(context.savedView))
  const isShown = (tab: FilesTab) => shown !== null && sameFilesTab(shown, tab)
  const close = (tab: FilesTab) => {
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
    <>
      {tabs.map((tab) => (
        <FileTabItem
          key={`${tab.kind}:${tab.path}`}
          navigation={navigation}
          onClose={() => close(tab)}
          selected={isShown(tab)}
          tab={tab}
        />
      ))}
    </>
  )
}

/** What the kept chat gets from the Files screens. */
export interface ChatFiles {
  extraTabs?: ReactNode
  onOpenDiff?: (path: string) => void
}

/**
 * The file parts of the kept chat: the file and diff tabs after the session
 * tabs on desktop, and the diff that a file of a finished turn opens. When
 * the chat makes a session active while `content` shows a file, the address
 * goes back to the chat. An archived workspace has no files.
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
    extraTabs:
      context.viewport === 'phone' ? undefined : (
        <FileTabs context={context} navigation={navigation} shown={shown} />
      ),
    onOpenDiff: (path) => navigation.navigate({ kind: 'diff', path }),
  }
}
