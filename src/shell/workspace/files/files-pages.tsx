import { useMemo, type ReactNode } from 'react'
import { replacesShownFile } from '../../../../docs/mockups/src/components/workspace/sandboxNoticeState'
import type { WorkspaceFiles } from '../../../files/model/files-store'
import {
  isFilesTab,
  type FilesLayout,
  type FilesNavigation,
  type FilesTab,
} from '../../../files/navigation'
import { DiffPage } from '../../../files/page/DiffPage'
import { FilePage } from '../../../files/page/FilePage'
import { KeptScroll, scrollTabKey } from '../../../files/ui/kept-scroll'
import type { WorkspaceView } from '../../../shared/workspace-view'
import type { WorkspaceContext } from '../features'
import { SandboxPanel } from '../SandboxNotice'
import { contentState } from '../sandbox-view'
import { useAddressLines } from './address-lines'
import { filesPlace, tabOf } from './files-address'
import { useFilesNavigation, useOpenTab } from './files-navigation'
import { sameFilesTab } from './view-tabs'
import { useFileTargets, useKeptFiles } from './workspace-files'

// The pages of the file and diff tabs: in the panes of the centre of a
// desktop, and in the Files tab of a phone.

/**
 * The state of a sandbox that does not run, in place of the content of a
 * file or diff page. The page hides the bar of the chat, so the state shows
 * the action of the bar, Resume or Try again, and the words of a refusal.
 * While the open resumes the sandbox, it shows the wait of a start.
 */
function pagePlaceholder(context: WorkspaceContext): ReactNode {
  const state = contentState(context.panel, context.resumingAtOpen)
  if (!state) return undefined
  return (
    <SandboxPanel
      phone
      resume={context.resume}
      state={state}
      workspace={context.workspace}
    />
  )
}

/**
 * A file tab or a diff tab as a page. The page of the address keeps its tab
 * in the saved view, and marks the lines that the address names. A page of
 * a pane of a split that the address does not name, `address` false, only
 * shows its tab. While the sandbox does not run, the page reads nothing. A
 * sandbox that is stopped or starts, and one whose later start failed, keep
 * the file that the page shows, as they keep the lists. Otherwise the state
 * of the sandbox takes the place of the content, which is the wait while it
 * starts.
 */
export function TabPage(props: {
  context: WorkspaceContext
  files: WorkspaceFiles
  tab: FilesTab
  address: boolean
  navigation: FilesNavigation
  layout: FilesLayout
}) {
  const { tab, context, address } = props
  useOpenTab(context.savedView, tab, address)
  const lines = useAddressLines()
  const targets = useFileTargets(context.org.id)
  const common = {
    files: props.files,
    layout: props.layout,
    navigation: props.navigation,
    placeholder: pagePlaceholder(context),
    keepShown: context.panel !== null && !replacesShownFile(context.panel),
    targets,
  }
  return tab.kind === 'file' ? (
    <FilePage
      {...common}
      key={tab.path}
      lines={address ? lines : null}
      tab={tab}
    />
  ) : (
    <DiffPage {...common} key={tab.path} tab={tab} />
  )
}

/**
 * A file or diff tab in a pane of the centre of a desktop: the tab of the
 * address, or, with `address` false, the shown tab of the other pane of a
 * split. Each tab keeps its scroll offset in the kept files of the
 * workspace.
 */
function FilesCenter(props: {
  context: WorkspaceContext
  tab: FilesTab
  address: boolean
}) {
  const { context, tab } = props
  const files = useKeptFiles(context)
  const navigation = useFilesNavigation(context)
  const tabKey = scrollTabKey(tab)
  const kept = useMemo(
    () => ({ places: files.scrollPlaces, tab: tabKey }),
    [files, tabKey],
  )
  return (
    <KeptScroll.Provider value={kept}>
      <TabPage
        address={props.address}
        context={context}
        files={files}
        layout="desktop"
        navigation={navigation}
        tab={tab}
      />
    </KeptScroll.Provider>
  )
}

/**
 * The page that each pane of the kept chat shows in place of the chat of a
 * session on desktop, by the index of the pane, or null for the chat. The
 * file or diff tab of the address shows in the pane that holds its tab,
 * else in the focused pane, where its tab opens. While two panes show, the
 * other pane shows its own shown file or diff tab of the saved view. One
 * pane shows the chat while the address names no file. A phone shows files
 * in its Files tab, and an archived workspace keeps its chat only.
 */
export function filesPages(
  context: WorkspaceContext,
  view: WorkspaceView | null,
): (ReactNode | null)[] {
  if (context.viewport === 'phone' || context.sandbox === 'archived') {
    return []
  }
  const address = tabOf(filesPlace(context.view))
  const page = (tab: FilesTab, fromAddress: boolean) => (
    <FilesCenter address={fromAddress} context={context} tab={tab} />
  )
  const panes = view?.panes ?? []
  if (panes.length < 2) return [address ? page(address, true) : null]
  const holder = panes.findIndex((pane) =>
    pane.tabs.some(
      (tab) => isFilesTab(tab) && address && sameFilesTab(tab, address),
    ),
  )
  const addressPane = holder < 0 ? (view?.focusedPane ?? 0) : holder
  return panes.map((pane, index) => {
    if (address && index === addressPane) return page(address, true)
    return isFilesTab(pane.activeTab) ? page(pane.activeTab, false) : null
  })
}
