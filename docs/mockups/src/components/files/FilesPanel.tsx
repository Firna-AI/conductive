import type { ReactNode } from 'react'
import {
  splitPath,
  withContextOpen,
  withPublicOpen,
  type TreeEntry,
} from '../../fixtures/files'
import { filesFor, type PathState } from '../../fixtures/maskedFiles'
import { limitedLists, type ListState } from '../../fixtures/limitedFiles'
import type { BannerState } from '../../../../../src/ui/components/workspace/barModel'
import { wholeChange } from '../../../../../src/ui/components/files/changeTotals'
import { paths } from '../../paths'
import { allFilesUnavailable } from '../../../../../src/ui/components/chat/lostCopy'
import { lostUpdateRow } from '../../entries/components/chat/LostUpdate.mockup'
import { emptyState } from '../../entries/components/common/EmptyState.mockup'
import { changeList } from '../../entries/components/files/ChangeList.mockup'
import { checksList } from '../../entries/components/files/ChecksList.mockup'
import { listNotice } from '../../entries/components/files/ListNotice.mockup'
import type { FileRowMenu } from './FileRowMenu'
import { FileTabs } from './FileTabs'
import { fileTree } from '../../entries/components/files/FileTree.mockup'
import { defined } from '../../defined'
import styles from './FilesPanel.module.css'

/** The lists of the files panel. */
export const fileLists = ['all', 'changes', 'checks'] as const

export type FileList = (typeof fileLists)[number]

/**
 * The list of All files: the latest one, the one saved before the cloud
 * computer could not read the files, or none when it saved none before.
 */
export const treeStates = ['latest', 'saved', 'none'] as const

export type TreeState = (typeof treeStates)[number]

/**
 * The kinds of file that open as a tab in the centre column: a code file,
 * the code file at a range of lines that an answer named, a Markdown file,
 * a diff, the diff of a file whose label hides a secret value, and a file
 * whose name the app does not know. Then a picture of
 * the branch, an image whose bytes the browser cannot draw, the copy of an
 * attached screenshot, which All files does not list, and the screenshot
 * of the agent in the closed context folder. Then the HTML report of the
 * context folder: its page, its source, the wait until its page loads, the
 * notice of older cloud computer software, and a preview that did not
 * open.
 */
export type FileTabView =
  | 'code'
  | 'code-lines'
  | 'markdown'
  | 'diff'
  | 'masked-diff'
  | 'unnamed'
  | 'image'
  | 'image-not-drawn'
  | 'attachment'
  | 'screenshot'
  | 'html'
  | 'html-source'
  | 'html-opening'
  | 'html-older-software'
  | 'html-failed'

/** The open tab whose row All files marks: a file of the tree. */
function treeTab(open: FileTabView | undefined): TreeEntry['preview'] {
  switch (open) {
    case 'code-lines':
      return 'code'
    case 'code':
    case 'markdown':
    case 'image':
    case 'image-not-drawn':
    case 'html':
      return open
    case 'html-source':
    case 'html-opening':
    case 'html-older-software':
    case 'html-failed':
      return 'html'
    default:
      return undefined
  }
}

/**
 * The tree with the folder of the open file open: the public folder for an
 * image of the branch, and the context folder for the report.
 */
function withOpenFolder(
  tree: readonly TreeEntry[],
  open: TreeEntry['preview'],
): readonly TreeEntry[] {
  switch (open) {
    case 'image':
    case 'image-not-drawn':
      return withPublicOpen(tree)
    case 'html':
      return withContextOpen(tree)
    default:
      return tree
  }
}

/**
 * The files of the workspace: the All files, Changes, and Checks tabs. A
 * file opens as a tab in the centre column, and `open` marks its row. A
 * branch without edits has no changes yet. A `placeholder`, such as the
 * state of a sandbox that starts, replaces the file lists. The checks come
 * from GitHub and still show. When the cloud computer could not read the
 * files, `tree` keeps the saved list under a notice, or says that no list
 * is available. `paths` adds two files whose labels hide a secret value.
 * `checksTop` stands above the checks, such as the actions of the pull
 * request bar on a phone. `only` keeps the changes of these paths, such as
 * the changed files that moved to the new branch of Continue. `menu` is the
 * open menu of a row of the shown list. Limited `lists` show the lists of a
 * large branch: each list keeps a notice of what it leaves out, also beside
 * the notice of a list that is not the latest one, and the Changes tab
 * counts the whole change. While `only` filters the changes, the rows are
 * no longer the list of the large branch, so its totals and its notice of
 * Changes stay out, and the tab counts the rows.
 * `markdownTo` is the page that the row of README.md in All files leads to,
 * when it differs from its plain preview, such as with a kept skill tab.
 */
export function FilesPanel(props: {
  view: FileList
  edited: boolean
  banner: BannerState
  tree: TreeState
  lists?: ListState
  open?: FileTabView
  placeholder?: ReactNode
  paths?: PathState
  checksTop?: ReactNode
  only?: readonly string[]
  menu?: FileRowMenu
  markdownTo?: string
}) {
  const { view, open, only } = props
  const limited = props.lists === 'limited' ? limitedLists : undefined
  const masked = !limited && props.paths === 'masked'
  const files = limited ?? filesFor(props.paths ?? 'plain')
  const changes = props.edited
    ? files.changes.filter((file) => !only || only.includes(file.path))
    : []
  const totals = props.edited && !only ? limited?.totals : undefined
  const names = new Set(changes.map((file) => splitPath(file.path).name))
  const treeOpen = treeTab(open)
  const shown = withOpenFolder(files.tree, treeOpen)
  const tree = shown.map((entry) =>
    props.edited && (!only || names.has(entry.name))
      ? entry
      : { ...entry, change: undefined },
  )
  const lists = !props.placeholder
  return (
    <div className={styles.files}>
      <FileTabs
        banner={props.banner}
        changes={
          totals
            ? wholeChange(totals.listed, totals.omitted).files
            : changes.length
        }
        view={view}
      />
      {view === 'checks' ? props.checksTop : null}
      {view === 'checks' ? (
        <checksList.Component
          moklyInstance="checks-list"
          state={props.banner}
        />
      ) : null}
      {view !== 'checks' && props.placeholder ? props.placeholder : null}
      {view === 'all' && lists && props.tree === 'none' ? (
        <emptyState.Component
          body={allFilesUnavailable.body}
          icon="circle-slash"
          moklyInstance="all-files-empty"
          title={allFilesUnavailable.title}
        />
      ) : null}
      {view === 'all' && lists && props.tree !== 'none' && limited ? (
        <listNotice.Component
          count={limited.omittedEntries}
          list="all-files"
          moklyInstance="files-omitted"
        />
      ) : null}
      {view === 'all' && lists && props.tree !== 'none' ? (
        <div className={styles.scroll} data-mokly-scroll="file-tree">
          <fileTree.Component
            entries={tree}
            moklyInstance="file-tree"
            {...defined({
              markdownTo: props.markdownTo,
              menu: props.menu,
              open: treeOpen,
            })}
          />
        </div>
      ) : null}
      {view === 'changes' && lists ? (
        <changeList.Component
          diffOpen={open === 'diff' || open === 'masked-diff'}
          diffTo={masked ? paths.maskedPaths : paths.diff}
          files={changes}
          moklyInstance="change-list"
          {...defined({ menu: props.menu, totals })}
        />
      ) : null}
      {props.tree === 'saved' ? (
        <lostUpdateRow.Component
          moklyInstance="lost-files"
          repair={{ data: 'all-files' }}
        />
      ) : null}
    </div>
  )
}
