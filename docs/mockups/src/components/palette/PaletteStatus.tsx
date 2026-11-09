import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { LoadFailure } from '../common/LoadFailure'
import type { PaletteContent } from './paletteContent'
import { paletteTabPaths } from './paletteViews'
import styles from './CommandPalette.module.css'

/** The notice of each read that failed: it names what did not load. */
const failures = {
  'list-failed': "The workspaces didn't load",
  'repositories-failed': "The repositories didn't load",
} as const

/**
 * The status part, which stands first in the results, in place of the
 * workspace groups: a spinner while their data loads, or the notice of a
 * read that failed, with Try again. Try again shows the tab with its data
 * when the catalogue draws it, which it does for an empty field.
 */
export function PaletteStatusPart(props: { content: PaletteContent }) {
  const { content } = props
  const theme = useSharedUiTheme()
  switch (content.status) {
    case undefined:
      return null
    case 'repositories-loading':
      return (
        <div className={styles.loading}>
          <Spinner
            accessibilityLabel="Loading the workspaces"
            color={theme.colors.muted}
            size={14}
          />
        </div>
      )
    case 'list-failed':
    case 'repositories-failed':
      return (
        <div className={styles.status}>
          <LoadFailure
            title={failures[content.status]}
            to={content.query === '' ? paletteTabPaths[content.tab] : undefined}
          />
        </div>
      )
  }
}
