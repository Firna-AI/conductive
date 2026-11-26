import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { defined } from '../../defined'
import { loadFailure } from '../../entries/components/common/LoadFailure.mockup'
import {
  paletteTabPaths,
  type PaletteStatus,
  type PaletteTab,
} from './paletteViews'
import styles from '../../../../../src/ui/components/palette/CommandPalette.module.css'

/** The notice of each read that failed: it names what did not load. */
const failures = {
  'list-failed': "The workspaces didn't load",
  'repositories-failed': "The repositories didn't load",
} as const

/**
 * The status part, which stands first in the results, in place of the
 * workspace groups: a spinner while their data loads, or the notice of a
 * read that failed, with Try again. `status` is the workspace data that
 * the palette lacks, and nothing shows without it. Try again shows the tab
 * with its data when the catalogue draws it, which it does for an empty
 * field: `query` is the text of the field, and `tab` the open tab.
 */
export function PaletteStatusPart(props: {
  status?: PaletteStatus
  query: string
  tab: PaletteTab
}) {
  const theme = useSharedUiTheme()
  switch (props.status) {
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
          <loadFailure.Component
            title={failures[props.status]}
            {...defined({
              to: props.query === '' ? paletteTabPaths[props.tab] : undefined,
            })}
          />
        </div>
      )
  }
}
