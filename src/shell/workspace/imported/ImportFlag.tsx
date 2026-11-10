import { Badge } from '@firna/ui/badge'
import styles from '../../../../docs/mockups/src/components/conductor-import/ImportedParts.module.css'

/**
 * The flag of a workspace that came from an import of Conductor, in the
 * header after its number. It keeps its width in a line that shortens the
 * parts around it.
 */
export function ImportFlag() {
  return (
    <span className={styles.flag}>
      <Badge size="sm">From Conductor</Badge>
    </span>
  )
}
