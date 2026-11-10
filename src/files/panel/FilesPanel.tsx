import { useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { CircleAlert, CircleSlash, FileDiff, Files } from 'lucide-react'
import type { WorkspaceTab } from '../../shared/workspace-view'
import { allFilesUnavailable } from '../../../docs/mockups/src/components/chat/lostCopy'
import type { FilesSnapshot, WorkspaceFiles } from '../model/files-store'
import { treeRows } from '../model/tree-rows'
import {
  isFilesTab,
  type FileListKind,
  type FilesLayout,
  type FilesNavigation,
  type FilesTab,
} from '../navigation'
import { ActionButton } from '../ui/actions'
import { EmptyState, Loading } from '../ui/EmptyState'
import { LayoutRoot } from '../ui/layout'
import { LinkTabs, type LinkTab } from '../ui/LinkTabs'
import { PanelBar } from '../ui/PanelBar'
import { ChangeList } from './ChangeList'
import { FileTree } from './FileTree'
import styles from './FilesPanel.module.css'
import { UnavailableLists } from './UnavailableLists'

/** The live snapshot of the files of a workspace. */
export function useFilesSnapshot(files: WorkspaceFiles): FilesSnapshot {
  return useSyncExternalStore(
    files.subscribe,
    files.getSnapshot,
    files.getSnapshot,
  )
}

function ReadFailed(props: { title: string; onRetry: () => void }) {
  return (
    <EmptyState
      action={<ActionButton onPress={props.onRetry}>Try again</ActionButton>}
      alert
      icon={CircleAlert}
      title={props.title}
    />
  )
}

interface ListProps {
  files: WorkspaceFiles
  snapshot: FilesSnapshot
  open: FilesTab | null
  navigation: FilesNavigation
}

function AllFiles(props: ListProps) {
  const { files, snapshot, open } = props
  const openPath = open?.kind === 'file' ? open.path : null
  const { tree, folders } = snapshot
  const rows = useMemo(
    () => (tree ? treeRows(tree, folders, openPath) : []),
    [tree, folders, openPath],
  )
  // With no saved tree to show, the mark wins over a read that still waits
  // or failed, and over an empty list, which would say that the branch has
  // no files. A saved tree stays visible under its notice.
  if (rows.length === 0 && snapshot.treeUnavailable) {
    return (
      <EmptyState
        body={allFilesUnavailable.body}
        icon={CircleSlash}
        title={allFilesUnavailable.title}
      />
    )
  }
  if (!tree) {
    if (!snapshot.treeError) return <Loading label="Loading files" />
    return (
      <ReadFailed onRetry={() => files.retry()} title="The files didn't load" />
    )
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        body="Files that the agent creates appear as it works."
        icon={Files}
        title="Files show here"
      />
    )
  }
  return (
    <div className={styles.scroll}>
      <FileTree
        navigation={props.navigation}
        onFolder={(path, isOpen) => files.setFolderOpen(path, isOpen)}
        openMode={open?.kind === 'file' ? open.mode : 'preview'}
        openPath={openPath}
        revealed={snapshot.revealed}
        rows={rows}
      />
    </div>
  )
}

function Changes(props: ListProps) {
  const { files, snapshot, open } = props
  const { changes } = snapshot
  if (!changes) {
    if (!snapshot.changesError) return <Loading label="Loading changes" />
    return (
      <ReadFailed
        onRetry={() => files.retry()}
        title="The changes didn't load"
      />
    )
  }
  if (changes.files.length === 0) {
    return (
      <EmptyState
        body="Files that the agent edits appear as it works."
        icon={FileDiff}
        title="Changes show here"
      />
    )
  }
  return (
    <ChangeList
      changes={changes}
      navigation={props.navigation}
      openPath={open?.kind === 'diff' ? open.path : null}
    />
  )
}

/**
 * The All files, Changes, and Checks lists of a workspace, with their tabs.
 * The right column of the desktop layout shows it, and so does the Files
 * tab of a phone. The GitHub banner screens supply the Checks list.
 */
export function FilesPanel(props: {
  files: WorkspaceFiles
  list: FileListKind
  /** The open tab of the workspace view, whose row the lists mark. */
  activeTab: WorkspaceTab | null
  navigation: FilesNavigation
  layout: FilesLayout
  checks?: ReactNode
  /** Shows in place of All files and Changes, such as a sandbox state. */
  placeholder?: ReactNode
  /**
   * The time now, for the age of a notice under the lists. Give a stable
   * function. The default is the clock of the browser.
   */
  now?: () => number
}) {
  const { files, list, navigation } = props
  const snapshot = useFilesSnapshot(files)
  const open = isFilesTab(props.activeTab) ? props.activeTab : null
  const count = snapshot.changes?.summary.files ?? 0
  const tabs: LinkTab[] = [
    {
      label: 'All files',
      to: { kind: 'list', list: 'all' },
      selected: list === 'all',
    },
    {
      label: 'Changes',
      to: { kind: 'list', list: 'changes' },
      count: count > 0 ? count : undefined,
      selected: list === 'changes',
    },
    {
      label: 'Checks',
      to: { kind: 'list', list: 'checks' },
      selected: list === 'checks',
    },
  ]
  const listProps = { files, snapshot, open, navigation }
  let body: ReactNode = props.placeholder
  if (list === 'checks') body = props.checks
  else if (!body) {
    body =
      list === 'all' ? <AllFiles {...listProps} /> : <Changes {...listProps} />
  }
  return (
    <LayoutRoot className={styles.files} layout={props.layout}>
      <div className={styles.lists}>
        <PanelBar>
          <LinkTabs label="Files" navigation={navigation} tabs={tabs} />
        </PanelBar>
        {body}
      </div>
      <UnavailableLists
        failed={snapshot.failedRepairs}
        now={props.now ?? Date.now}
        savedTree={
          snapshot.treeUnavailable && (snapshot.tree?.entries.size ?? 0) > 0
        }
      />
    </LayoutRoot>
  )
}
