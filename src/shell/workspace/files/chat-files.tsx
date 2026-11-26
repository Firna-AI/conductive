import { useSyncExternalStore, type ReactNode } from 'react'
import { useNavigation } from '../../../app/navigation'
import { routes } from '../../../app/router'
import type { RenderedTab, TabDraw } from '../../../chat/components/tab-row'
import type { ChatMentions } from '../../../chat/mentions/MentionsContext'
import { tabKey } from '../../../chat/state/tab-order'
import { tabHidesSecret, tabLabel } from '../../../files/model/file-labels'
import { scrollTabKey } from '../../../files/ui/kept-scroll'
import { useFollowTabs } from '../../../app/tab-places'
import type { FilesNavigation, FilesTab } from '../../../files/navigation'
import {
  FileTabItem,
  fileTabName,
  LiftedFileTab,
} from '../../../files/tabs/FileTabItem'
import type { WorkspaceTab } from '../../../shared/workspace-view'
import { usePageEscape } from '../../shortcuts/page-escape'
import { useShortcutOffer } from '../../shortcuts/shortcut-context'
import type { WorkspaceContext } from '../features'
import { useSavedView } from '../saved-view'
import { skillTabsOf, useSkillNavigation } from '../skills/skill-navigation'
import { useCopyPath } from './copy-path'
import { useMentions } from './chat-mentions'
import { filesPlace, tabOf } from './files-address'
import { useFilesNavigation, useLeaveForSession } from './files-navigation'
import {
  filesTabsOf,
  isTemporaryTab,
  sameFilesTab,
  withoutTab,
} from './view-tabs'
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
    snapshot === null ? null : tabLabel(snapshot, tab.path, tab.kind)
}

/**
 * A file or diff tab of the saved view, at the place in the tab row that
 * the chat gives it, with the label of its path, and in italics when the
 * view marks it as the temporary tab. Close of the shown tab shows the next
 * file tab, else the one before, else the chat with its session. A close of
 * the temporary tab clears the mark. While the tab shows, the key of Close
 * tab closes it, as its Close does. While the temporary tab shows, Escape
 * closes it too, when no menu, dialog, drag, or text field takes the key.
 */
function FileTab(props: {
  context: WorkspaceContext
  navigation: FilesNavigation
  shown: FilesTab | null
  tab: FilesTab
  label: string | null
  temporary: boolean
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
  usePageEscape(isShown(tab) && props.temporary ? close : null)
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
      temporary={props.temporary}
    />
  )
}

/** What the kept chat gets from the Files screens. */
export interface ChatFiles {
  renderTab?: (tab: FilesTab) => RenderedTab
  onOpenDiff?: (path: string) => void
  mentions?: ChatMentions
}

/**
 * The file parts of the kept chat: on desktop, the file and diff tabs at
 * their places in the tab row, with the copy that a drag lifts, and the
 * diff that a file of a finished turn opens. Each tab takes the label of
 * its path from the kept files, for its title and its drawing, so each name
 * of the tab hides each secret value. The temporary tab of the saved view
 * draws its title in italics, also on the lifted copy, and its title for
 * the row stays the name alone. Keep open of its tab menu keeps it, as a
 * double-click on it does. Copy path of the tab menu of each tab copies the
 * real path of its file, also in a read-only workspace, unless the label of
 * the tab hides a secret value or is not known yet. When the chat makes a
 * session active while `content` shows a file, the address goes back to the
 * chat. The chat reads the kept files for the list of `@` and the file
 * chips, also on a phone before a visit to Files: `KeptConnections` of the
 * screen keeps them connected. It reads the skill lists of the workspace
 * for the list of `/` and the skill chips, and a press on a skill chip
 * opens its skill tab. A file, diff, or skill tab that leaves the saved
 * view, such as one that the user closed, forgets its kept scroll offset.
 * An archived workspace has no files and no skills.
 */
export function useChatFiles(
  context: WorkspaceContext,
  content: ReactNode,
): ChatFiles {
  const navigation = useFilesNavigation(context)
  const view = useSavedView(context.savedView)
  const shown = content === null ? null : tabOf(filesPlace(context.view))
  useLeaveForSession(context, content !== null)
  const archived = context.sandbox === 'archived'
  const tabs = !archived && context.viewport !== 'phone'
  const labelOf = useTabLabels(context, tabs)
  const files = useKeptFilesWhile(context, !archived)
  useFollowTabs(
    files?.scrollPlaces ?? null,
    view
      ? [
          ...filesTabsOf(view).map(scrollTabKey),
          ...skillTabsOf(view).map(tabKey),
        ]
      : null,
  )
  const skillTabs = useSkillNavigation(context)
  const mentions = useMentions(context, files, navigation, skillTabs)
  const copyPath = useCopyPath(context.org.id)
  if (archived) return {}
  const renderTab = (tab: FilesTab): RenderedTab => {
    const label = labelOf(tab)
    const temporary = isTemporaryTab(view, tab)
    const hides = tabHidesSecret(tab.path, label)
    return {
      title: fileTabName(tab, label),
      draw: (draw) =>
        draw.kind === 'lifted' ? (
          <LiftedFileTab label={label} tab={tab} temporary={temporary} />
        ) : (
          <FileTab
            context={context}
            draw={draw}
            label={label}
            navigation={navigation}
            shown={shown}
            tab={tab}
            temporary={temporary}
          />
        ),
      show: () => navigation.navigate(tab),
      keep: temporary ? () => navigation.keep(tab) : null,
      copyPath: hides ? null : () => copyPath(tab.path),
    }
  }
  return {
    renderTab: tabs ? renderTab : undefined,
    onOpenDiff: (path) => navigation.navigate({ kind: 'diff', path }),
    mentions,
  }
}
