import { useContext, useMemo, useSyncExternalStore } from 'react'
import type { FileEntry } from '../../../shared/generated/FileEntry'
import { useNavigation } from '../../../app/navigation'
import { routes } from '../../../app/router'
import type { RenderTab, TabDraw } from '../../../chat/components/tab-row'
import type { ChatMentions } from '../../../chat/mentions/MentionsContext'
import { tabLabel } from '../../../files/model/file-labels'
import type { WorkspaceFiles } from '../../../files/model/files-store'
import { scrollTabKey } from '../../../files/ui/kept-scroll'
import { useFollowTabs } from '../../../app/tab-places'
import {
  isFilesTab,
  type FilesNavigation,
  type FilesTab,
  type FilesTarget,
} from '../../../files/navigation'
import type { LineRange } from '../../../shared/line-target'
import { PanelContext } from '../../layout/panels'
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
import {
  filesTabsOf,
  isTemporaryTab,
  sameFilesTab,
  withoutTab,
} from './view-tabs'
import { useKeptFilesWhile } from './workspace-files'
import { paneSessionId } from '../../../chat/state/pane-selection'

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
 * view marks it as the temporary tab. It shows as the current tab of its
 * row while its pane shows it. Close of a shown tab shows the next file tab
 * of its pane, else the one before, else the chat of the last session of
 * that pane. When the address names the tab, the address follows. A close
 * of the temporary tab clears the mark. While the tab shows in the focused
 * pane, the key of Close tab closes it, as its Close does.
 */
function FileTab(props: {
  context: WorkspaceContext
  navigation: FilesNavigation
  /** The tab of the address, while its page shows. */
  shown: FilesTab | null
  tab: FilesTab
  label: string | null
  temporary: boolean
  draw: Extract<TabDraw, { kind: 'row' }>
}) {
  const { context, navigation, shown, tab, draw } = props
  const go = useNavigation()
  const addressed = shown !== null && sameFilesTab(shown, tab)
  const close = () => {
    const snapshot = context.savedView.getSnapshot()
    const owner = (snapshot.view?.panes ?? []).findIndex((pane) =>
      pane.tabs.some((open) => isFilesTab(open) && sameFilesTab(open, tab)),
    )
    const tabs = filesTabsOf(snapshot.view, owner)
    const index = tabs.findIndex((open) => sameFilesTab(open, tab))
    const rest = tabs.filter((open) => !sameFilesTab(open, tab))
    const next =
      draw.selected || addressed
        ? (rest[Math.min(index, rest.length - 1)] ?? null)
        : null
    const sessionId = paneSessionId(snapshot, owner === 1 ? 1 : 0)
    const session: WorkspaceTab | null = sessionId
      ? { kind: 'session', sessionId }
      : null
    context.savedView.updateView((view) =>
      withoutTab(view, tab, next ?? session),
    )
    if (!addressed) return
    go.push(
      next
        ? navigation.href(next)
        : routes.workspace(context.org.id, context.workspace.id),
    )
  }
  useShortcutOffer('close-tab', draw.selected && draw.focused ? close : null)
  return (
    <FileTabItem
      label={props.label}
      close={draw.close}
      item={draw.item}
      link={draw.link}
      navigation={navigation}
      onClose={close}
      selected={draw.selected}
      tab={tab}
      temporary={props.temporary}
    />
  )
}

/** What the kept chat gets from the Files screens. */
export interface ChatFiles {
  renderTab?: RenderTab
  onOpenDiff?: (path: string) => void
  mentions?: ChatMentions
}

/**
 * The page of a chip: the file, or All files for a folder. A file with
 * lines opens as text, also a Markdown file, because only the text has
 * line numbers.
 */
function chipTarget(entry: FileEntry, lines?: LineRange): FilesTarget {
  return entry.kind === 'directory'
    ? { kind: 'list', list: 'all' }
    : { kind: 'file', path: entry.path, mode: lines ? 'source' : 'preview' }
}

/**
 * The files that the composer lists after `@`, and the pages of the chips.
 * A file opens as a press in All files opens it. A folder shows All files
 * with the folder open, in the right column on desktop, which then shows.
 */
function useMentions(
  context: WorkspaceContext,
  files: WorkspaceFiles | null,
  navigation: FilesNavigation,
): ChatMentions | undefined {
  const panels = useContext(PanelContext)
  const phone = context.viewport === 'phone'
  return useMemo(() => {
    if (!files) return undefined
    return {
      files,
      openFile: (path, lines) =>
        navigation.navigate(
          { kind: 'file', path, mode: lines ? 'source' : 'preview' },
          lines,
        ),
      showFolder: (path) => {
        files.revealFolder(path)
        if (!phone) panels?.rightShown.set(true)
        navigation.navigate({ kind: 'list', list: 'all' })
      },
      href: (entry, lines) => navigation.href(chipTarget(entry, lines), lines),
    }
  }, [files, navigation, panels, phone])
}

/**
 * The file parts of the kept chat: on desktop, the file and diff tabs at
 * their places in the tab rows, with the copy that a drag lifts, and the
 * diff that a file of a finished turn opens. Each tab takes the label of
 * its path from the kept files, for its title and its drawing, so each name
 * of the tab hides each secret value. The temporary tab of each pane draws
 * its title in italics, also on the lifted copy, and its title for the row
 * stays the name alone. Keep open of its tab menu keeps it, as a
 * double-click on it does. `pages` says that the chat shows the pages of
 * files on desktop. When the chat then makes a session the shown tab of the
 * focused pane while the address names a file, the address goes back to
 * the chat. The chat reads
 * the kept files for the list of `@` and the file chips, also on a phone
 * before a visit to Files: `KeptFilesConnection` of the screen keeps them
 * connected. A file or diff tab that leaves the saved view, such as one
 * that the user closed, forgets its kept scroll offset. An archived
 * workspace has no files.
 */
export function useChatFiles(
  context: WorkspaceContext,
  pages: boolean,
): ChatFiles {
  const navigation = useFilesNavigation(context)
  const view = useSavedView(context.savedView)
  const shown = pages ? tabOf(filesPlace(context.view)) : null
  useLeaveForSession(context, shown !== null)
  const archived = context.sandbox === 'archived'
  const tabs = !archived && context.viewport !== 'phone'
  const labelOf = useTabLabels(context, tabs)
  const files = useKeptFilesWhile(context, !archived)
  useFollowTabs(
    files?.scrollPlaces ?? null,
    view ? filesTabsOf(view).map(scrollTabKey) : null,
  )
  const mentions = useMentions(context, files, navigation)
  if (archived) return {}
  const renderTab: RenderTab = (tab) => {
    const label = labelOf(tab)
    const temporary = isTemporaryTab(view, tab)
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
    }
  }
  return {
    renderTab: tabs ? renderTab : undefined,
    onOpenDiff: (path) => navigation.navigate({ kind: 'diff', path }),
    mentions,
  }
}
