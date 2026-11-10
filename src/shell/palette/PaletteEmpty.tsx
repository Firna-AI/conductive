import styles from '../../../docs/mockups/src/components/palette/CommandPalette.module.css'
import type { PaletteEmpty as PaletteEmptyState } from '../../app/palette/palette-results'

/** What shows in place of the list when the tab has no row and no status part. */
export function PaletteEmpty(props: { empty: PaletteEmptyState }) {
  const { empty } = props
  switch (empty.kind) {
    case 'no-match':
      return (
        <div className={styles.empty} role="status">
          <p className={styles.emptyTitle}>Nothing matches “{empty.query}”</p>
          <p className={styles.emptyBody}>
            Try a workspace name, a branch, or a repository.
          </p>
        </div>
      )
    case 'line':
      return (
        <div className={styles.empty} role="status">
          <p className={styles.emptyBody}>{empty.text}</p>
        </div>
      )
  }
}
