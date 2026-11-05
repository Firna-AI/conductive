import { MockLink } from '@mokly/mokly'
import { List, ListItem } from '@firna/ui/list'
import { Caption } from '@firna/ui/typography'
import { FileDiff, FilePlus } from 'lucide-react'
import { changeLabels, splitPath, type ChangedFile } from '../../fixtures/files'
import { EmptyState } from '../common/EmptyState'
import { DiffStat } from './DiffStat'
import { previewPaths } from './previewPaths'
import styles from './ChangeList.module.css'

function Row(props: { file: ChangedFile }) {
  const { file } = props
  const { folder, name } = splitPath(file.path)
  const Icon = file.change === 'added' ? FilePlus : FileDiff
  const item = (
    <ListItem
      description={
        <Caption>
          {folder ? (
            <>
              <span className={styles.folder}>{folder}</span> ·{' '}
            </>
          ) : null}
          {changeLabels[file.change]}
        </Caption>
      }
      leading={<Icon className={styles.icon} size={18} />}
      size="sm"
      title={name}
      trailing={<DiffStat added={file.added} removed={file.removed} />}
    />
  )
  if (!file.preview) return <div className={styles.row}>{item}</div>
  return (
    <MockLink className={styles.row} to={previewPaths[file.preview]}>
      {item}
    </MockLink>
  )
}

/** The files that the workspace branch changes, against the default branch. */
export function ChangeList(props: { files: readonly ChangedFile[] }) {
  if (props.files.length === 0) {
    return (
      <EmptyState
        body="Files that the agent edits appear as it works."
        icon={FileDiff}
        title="Changes show here"
      />
    )
  }
  const added = props.files.reduce((sum, file) => sum + file.added, 0)
  const removed = props.files.reduce((sum, file) => sum + file.removed, 0)
  return (
    <div className={styles.changes}>
      <div className={styles.summary}>
        <Caption>{props.files.length} files changed</Caption>
        <DiffStat added={added} removed={removed} />
      </div>
      <div className={styles.scroll} data-mokly-scroll="changes">
        <List
          accessibilityLabel="Changed files"
          itemKey={(file) => file.path}
          items={[...props.files]}
          renderItem={(file) => <Row file={file} />}
          separators={false}
        />
      </div>
    </div>
  )
}
