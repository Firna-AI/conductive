import { Caption } from '@firna/ui/typography'
import {
  addressFormDiff,
  autocompleteHook,
  readme,
} from '../../fixtures/fileContents'
import { changedFiles, fileTree } from '../../fixtures/files'
import { paths } from '../../paths'
import { LinkTabs } from '../common/LinkTabs'
import { ChangeList } from './ChangeList'
import { CodeView } from './CodeView'
import { DiffStat } from './DiffStat'
import { DiffView } from './DiffView'
import { FileTree } from './FileTree'
import { MarkdownView } from './MarkdownView'
import { PreviewHeader } from './PreviewHeader'
import styles from './FilesPanel.module.css'

export const fileViews = ['all', 'changes', 'markdown', 'code', 'diff'] as const

export type FileView = (typeof fileViews)[number]

const allFiles = { label: 'All files', to: paths.filesAll }

/**
 * The files of the workspace: the All and Changes lists, or a preview of one
 * file. A branch without edits has no changes yet.
 */
export function FilesPanel(props: { view: FileView; edited: boolean }) {
  const { view } = props
  const changes = props.edited ? changedFiles : []
  const tree = props.edited
    ? fileTree
    : fileTree.map((entry) => ({ ...entry, change: undefined }))
  switch (view) {
    case 'all':
    case 'changes':
      return (
        <div className={styles.files}>
          <div className={styles.toolbar}>
            <LinkTabs
              label="Files"
              tabs={[
                { label: 'All', to: paths.filesAll, selected: view === 'all' },
                {
                  label: 'Changes',
                  to: paths.filesChanges,
                  selected: view === 'changes',
                },
              ]}
            />
          </div>
          {view === 'all' ? (
            <div className={styles.scroll} data-mokly-scroll="file-tree">
              <FileTree entries={tree} />
            </div>
          ) : (
            <ChangeList files={changes} />
          )}
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
              <Caption>{autocompleteHook.split('\n').length} lines</Caption>
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
