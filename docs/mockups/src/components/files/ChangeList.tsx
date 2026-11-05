import { MockLink } from '@mokly/mokly'
import { FileDiff } from 'lucide-react'
import { splitPath, type ChangedFile } from '../../fixtures/files'
import { EmptyState } from '../common/EmptyState'
import { ChangeIcon } from './ChangeIcon'
import { DiffStat } from './DiffStat'
import { previewPaths } from './previewPaths'
import styles from './ChangeList.module.css'

function Row(props: { file: ChangedFile }) {
  const { file } = props
  const { folder, name } = splitPath(file.path)
  const content = (
    <>
      <span className={styles.path}>
        {folder ? <span className={styles.folder}>{folder}/</span> : null}
        <span className={styles.name}>{name}</span>
      </span>
      <DiffStat added={file.added} removed={file.removed} />
      <ChangeIcon change={file.change} />
    </>
  )
  if (!file.preview) return <div className={styles.row}>{content}</div>
  return (
    <MockLink className={styles.row} to={previewPaths[file.preview]}>
      {content}
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
  return (
    <div className={styles.scroll} data-mokly-scroll="changes">
      <ul aria-label="Changed files" className={styles.list}>
        {props.files.map((file) => (
          <li key={file.path}>
            <Row file={file} />
          </li>
        ))}
      </ul>
    </div>
  )
}
