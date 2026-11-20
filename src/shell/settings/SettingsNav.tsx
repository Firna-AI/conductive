import { useId } from 'react'
import { ChevronRight } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/settings/SettingsNav.module.css'
import { AppLink } from '../ui/AppLink'
import type { SettingsGroup, SettingsRow } from './settings-tabs'

/**
 * The list of the tabs of Settings, in its groups. `panel` is the left
 * column of the dialog of a desktop, with the open tab selected. `touch` is
 * the first screen of a phone, where each row opens its tab as a screen.
 */
export function SettingsNav(props: {
  groups: readonly SettingsGroup[]
  variant: 'panel' | 'touch'
}) {
  const touch = props.variant === 'touch'
  return (
    <nav
      aria-label="Settings"
      className={classes(styles.nav, touch && styles.touch)}
    >
      {props.groups.map((group) => (
        <Group group={group} key={group.title} touch={touch} />
      ))}
    </nav>
  )
}

/** A group of the list, which its heading names: Account, or the org. */
function Group(props: { group: SettingsGroup; touch: boolean }) {
  const heading = useId()
  return (
    <div aria-labelledby={heading} className={styles.group} role="group">
      <h2 className={styles.heading} id={heading}>
        {props.group.title}
      </h2>
      <ul className={styles.rows}>
        {props.group.rows.map((row) => (
          <Row key={row.key} row={row} touch={props.touch} />
        ))}
      </ul>
    </div>
  )
}

/** A row that opens its tab. A phone marks no row, and shows a chevron. */
function Row(props: { row: SettingsRow; touch: boolean }) {
  const { row, touch } = props
  const Icon = row.icon
  const selected = row.selected && !touch
  return (
    <li>
      <AppLink
        aria-current={selected ? 'page' : undefined}
        className={classes(styles.row, selected && styles.selected)}
        to={row.to}
      >
        <Icon aria-hidden className={styles.icon} size={15} />
        <span className={styles.label}>{row.label}</span>
        {touch ? (
          <ChevronRight aria-hidden className={styles.end} size={16} />
        ) : null}
      </AppLink>
    </li>
  )
}
