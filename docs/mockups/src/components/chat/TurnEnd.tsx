import { MockLink } from '@mokly/mokly'
import { FileText } from 'lucide-react'
import { splitPath, type ChangedFile } from '../../fixtures/files'
import { DiffStat } from '../files/DiffStat'
import { paths } from '../../paths'
import styles from './TurnEnd.module.css'

function FileChip(props: { file: ChangedFile }) {
  const { file } = props
  const content = (
    <>
      <FileText className={styles.icon} size={12} />
      {splitPath(file.path).name}
      <DiffStat added={file.added} removed={file.removed} />
    </>
  )
  if (!file.diff) return <span className={styles.chip}>{content}</span>
  return (
    <MockLink className={styles.chip} to={paths.diff}>
      {content}
    </MockLink>
  )
}

/** The end of a finished turn: how long it ran, and the files it changed. */
export function TurnEnd(props: {
  duration: string
  files: readonly ChangedFile[]
}) {
  return (
    <div className={styles.end}>
      <span className={styles.duration}>{props.duration}</span>
      <ul aria-label="Files this turn changed" className={styles.chips}>
        {props.files.map((file) => (
          <li key={file.path}>
            <FileChip file={file} />
          </li>
        ))}
      </ul>
    </div>
  )
}
