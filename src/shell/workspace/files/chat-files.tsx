import { useSyncExternalStore, type ReactNode } from 'react'
import { useNavigation } from '../../../app/navigation'
import { routes } from '../../../app/router'
import type { RenderTab, TabDraw } from '../../../chat/components/tab-row'
import { listLabel } from '../../../files/model/file-labels'
import type { FilesNavigation, FilesTab } from '../../../files/navigation'
import {
  FileTabItem,
  fileTabName,
  LiftedFileTab,
} from '../../../files/tabs/FileTabItem'
import type { WorkspaceTab } from '../../../shared/workspace-view'
import { useShortcutOffer } from '../../shortcuts/shortcut-context'
import type { WorkspaceContext } from '../features'
import { useSavedView } from '../saved-view'
import { filesPlace, tabOf } from './files-address'
import { useFilesNavigation, useLeaveForSession } from './files-navigation'
import { filesTabsOf, sameFilesTab, withoutTab } from './view-tabs'
import { useKeptFilesWhile } from './workspace-files'

/** The subscription while the row shows no file tabs: to nothing. */
function followNothing(): () => void {
  return () => {}
}

/**
 * The label of the path of a tab, from the lists of the kept files, or null
 * when no list names it. It follows the kept files only while the row shows
 * file tabs, as `shows` says, so a phone and an archived workspace make no
 * store for it, and their chat draws nothing again when a list changes.
 */
function useTabLabels(
  context: WorkspaceContext,
  shows: boolean,
): (tab: FilesTab) => string | null {
  const files = useKeptFilesWhile(context, shows)
  const read = () => files?.getSnapshot() ?? null
  const snapshot = useSyncExternalStore(
    files?.subscribe ?? followNothing,
    read,
    read,
  )
  return (tab) =>
    snapshot === null ? null : listLabel(snapshot, tab.path, tab.kind)
}

/**
 * A file or diff tab of the saved view, at the place in the tab row that
 * the chat gives it, with the label of its path. Close of the shown tab
 * shows the next file tab, else the one before, else the chat with its
 * session. While the tab shows, the key of Close tab closes it, as its
 * Close does.
 */
function FileTab(props: {
  context: WorkspaceContext
  navigation: FilesNavigation
  shown: FilesTab | null
  tab: FilesTab
  label: string | null
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
  useShortcutOffer('close-tab', isShown(tab) ? close : null)
  return (
    <FileTabItem
      label={props.label}
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
 * diff that a file of a finished turn opens. Each tab takes the label of
 * its path from the kept files, for its title and its drawing, so each name
 * of the tab hides each secret value. When the chat makes a session active
 * while `content` shows a file, the address goes back to the chat. An
 * archived workspace has no files.
 */
export function useChatFiles(
  context: WorkspaceContext,
  content: ReactNode,
): ChatFiles {
  const navigation = useFilesNavigation(context)
  const shown = content === null ? null : tabOf(filesPlace(context.view))
  useLeaveForSession(context, shown !== null)
  const archived = context.sandbox === 'archived'
  const tabs = !archived && context.viewport !== 'phone'
  const labelOf = useTabLabels(context, tabs)
  if (archived) return {}
  const renderTab: RenderTab = (tab) => {
    const label = labelOf(tab)
    return {
      title: fileTabName(tab, label),
      draw: (draw) =>
        draw.kind === 'lifted' ? (
          <LiftedFileTab label={label} tab={tab} />
        ) : (
          <FileTab
            context={context}
            draw={draw}
            label={label}
            navigation={navigation}
            shown={shown}
            tab={tab}
          />
        ),
      show: () => navigation.navigate(tab),
    }
  }
  return {
    renderTab: tabs ? renderTab : undefined,
    onOpenDiff: (path) => navigation.navigate({ kind: 'diff', path }),
  }
}
