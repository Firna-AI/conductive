import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import styles from '../../../docs/mockups/src/components/palette/CommandPalette.module.css'
import type { PaletteRead } from '../../app/palette/palette-source'
import type { PaletteStatus } from '../../app/palette/palette-status'
import { LoadFailure } from '../ui/LoadFailure'

/**
 * The status part, which stands first in the results, in place of the
 * workspace groups: a spinner while their data loads, or the notice of a
 * read that failed, with Try again. It is not an option of the list, so
 * the arrows skip it.
 */
export function PaletteStatusPart(props: {
  status: PaletteStatus
  retry: (reads: readonly PaletteRead[]) => Promise<void>
}) {
  const theme = useSharedUiTheme()
  const { status } = props
  if (status.kind === 'loading') {
    return (
      <div className={styles.loading}>
        <Spinner
          accessibilityLabel="Loading the workspaces"
          color={theme.colors.muted}
          size={14}
        />
      </div>
    )
  }
  return (
    <div className={styles.status}>
      <LoadFailure
        error={status.error}
        retry={() => props.retry(status.retry)}
        title={status.title}
      />
    </div>
  )
}
