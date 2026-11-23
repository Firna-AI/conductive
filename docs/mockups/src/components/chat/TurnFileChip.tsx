import { FileText } from 'lucide-react'
import { splitPath, type ChangedFile } from '../../fixtures/files'
import { ScreenLink } from '../common/ScreenLink'
import { diffStat } from '../../entries/components/files/DiffStat.mockup'
import { paths } from '../../paths'
import styles from '../../../../../src/ui/components/chat/TurnEnd.module.css'

/**
 * A changed file of a finished turn, as the mockups draw it in the list of
 * the turn. It shows the lines that the file adds and removes only when
 * one count is above zero, so a file without line changes, such as a
 * binary file, has no "+0". A file with a drawn diff opens it.
 */
export function TurnFileChip(props: { file: ChangedFile }) {
  const { file } = props
  const content = (
    <>
      <FileText className={styles.icon} size={12} />
      {splitPath(file.path).name}
      {file.added > 0 || file.removed > 0 ? (
        <diffStat.Component added={file.added} removed={file.removed} />
      ) : null}
    </>
  )
  if (!file.diff) return <span className={styles.chip}>{content}</span>
  return (
    <ScreenLink className={styles.chip} to={paths.diff}>
      {content}
    </ScreenLink>
  )
}
