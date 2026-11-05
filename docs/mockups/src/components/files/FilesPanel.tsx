import type { ReactNode } from 'react'
import {
  addressFormDiff,
  autocompleteHook,
  readme,
} from '../../fixtures/fileContents'
import { changedFiles, fileTree } from '../../fixtures/files'
import type { BannerState } from '../../fixtures/pullRequests'
import { checksPaths, paths } from '../../paths'
import { LinkTabs } from '../common/LinkTabs'
import { PanelBar } from '../workspace/PanelBar'
import { ChangeList } from './ChangeList'
import { ChecksList } from './ChecksList'
import { CodeView } from './CodeView'
import { DiffStat } from './DiffStat'
import { DiffView } from './DiffView'
import { FileTree } from './FileTree'
import { MarkdownView } from './MarkdownView'
import { PreviewHeader } from './PreviewHeader'
import styles from './FilesPanel.module.css'

export const fileViews = [
  'all',
  'changes',
  'checks',
  'markdown',
  'code',
  'diff',
] as const

export type FileView = (typeof fileViews)[number]

const allFiles = { label: 'All files', to: paths.filesAll }

/** The All files, Changes, and Checks tabs, as links. */
function FileTabs(props: {
  view: FileView
  changes: number
  banner: BannerState
}) {
  return (
    <PanelBar>
      <LinkTabs
        label="Files"
        tabs={[
          {
            label: 'All files',
            to: paths.filesAll,
            selected: props.view === 'all',
          },
          {
            label: 'Changes',
            to: paths.filesChanges,
            count: props.changes > 0 ? props.changes : undefined,
            selected: props.view === 'changes',
          },
          {
            label: 'Checks',
            to: checksPaths[props.banner],
            selected: props.view === 'checks',
          },
        ]}
      />
    </PanelBar>
  )
}

/**
 * The files of the workspace: the All files, Changes, and Checks tabs, or a
 * preview of one file. A branch without edits has no changes yet. While the
 * sandbox does not run, `placeholder` replaces the file lists; the checks
 * come from GitHub and still show.
 */
export function FilesPanel(props: {
  view: FileView
  edited: boolean
  banner: BannerState
  placeholder?: ReactNode
}) {
  const { view } = props
  const changes = props.edited ? changedFiles : []
  const tree = props.edited
    ? fileTree
    : fileTree.map((entry) => ({ ...entry, change: undefined }))
  switch (view) {
    case 'all':
    case 'changes':
    case 'checks':
      return (
        <div className={styles.files}>
          <FileTabs
            banner={props.banner}
            changes={changes.length}
            view={view}
          />
          {view === 'checks' ? <ChecksList state={props.banner} /> : null}
          {view !== 'checks' && props.placeholder ? props.placeholder : null}
          {view === 'all' && !props.placeholder ? (
            <div className={styles.scroll} data-mokly-scroll="file-tree">
              <FileTree entries={tree} />
            </div>
          ) : null}
          {view === 'changes' && !props.placeholder ? (
            <ChangeList files={changes} />
          ) : null}
        </div>
      )
    case 'markdown':
      return (
        <div className={styles.files}>
          <PreviewHeader back={allFiles} path="README.md" />
          <MarkdownView blocks={readme} />
        </div>
      )
    case 'code':
      return (
        <div className={styles.files}>
          <PreviewHeader
            back={allFiles}
            meta={
              <span className={styles.meta}>
                {autocompleteHook.split('\n').length} lines
              </span>
            }
            path="src/app/checkout/useAddressAutocomplete.ts"
          />
          <CodeView code={autocompleteHook} />
        </div>
      )
    case 'diff':
      return (
        <div className={styles.files}>
          <PreviewHeader
            back={{ label: 'Changes', to: paths.filesChanges }}
            meta={<DiffStat added={38} removed={6} />}
            path="src/app/checkout/AddressForm.tsx"
          />
          <DiffView hunks={addressFormDiff} />
        </div>
      )
  }
}
