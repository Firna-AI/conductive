import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import styles from '../../../docs/mockups/src/components/palette/CommandPalette.module.css'
import type { PaletteEmpty as PaletteEmptyState } from '../../app/palette/palette-results'
import { LoadFailure } from '../ui/LoadFailure'
import local from './palette.module.css'

/** What shows in place of the list when the tab has no row. */
export function PaletteEmpty(props: {
  empty: PaletteEmptyState
  retry: () => Promise<void>
}) {
  const theme = useSharedUiTheme()
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
    case 'loading':
      return (
        <div className={styles.empty}>
          <Spinner
            accessibilityLabel="Loading the workspaces"
            color={theme.colors.muted}
            size={14}
          />
        </div>
      )
    case 'failed':
      return (
        <div className={local.failure}>
          <LoadFailure
            error={empty.error}
            retry={props.retry}
            title="The workspaces didn't load"
          />
        </div>
      )
  }
}
