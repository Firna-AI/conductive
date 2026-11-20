import { ChevronRight, type LucideIcon } from 'lucide-react'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import styles from './SettingsNav.module.css'

export type SettingsNavRow = {
  key: string
  label: string
  icon: LucideIcon
  to: string
  selected: boolean
}

export type SettingsNavGroup = {
  /** The heading of the group: Account, or the name of the org. */
  title: string
  rows: readonly SettingsNavRow[]
}

/**
 * The list of the tabs of Settings, in groups. `panel` draws it in the left
 * column of the Settings dialog, with the selected row filled. `touch`
 * draws it as the first screen of Settings on a phone, with a chevron at
 * the end of each row and no row selected, because each row opens its tab
 * as a screen of its own.
 */
export function SettingsNav(props: {
  groups: readonly SettingsNavGroup[]
  variant: 'panel' | 'touch'
}) {
  const touch = props.variant === 'touch'
  return (
    <nav
      aria-label="Settings"
      className={classes(styles.nav, touch && styles.touch)}
    >
      {props.groups.map((group) => (
        <div
          aria-label={group.title}
          className={styles.group}
          key={group.title}
          role="group"
        >
          <h2 className={styles.heading}>{group.title}</h2>
          <ul className={styles.rows}>
            {group.rows.map((row) => {
              const Icon = row.icon
              const selected = row.selected && !touch
              return (
                <li key={row.key}>
                  <ScreenLink
                    aria-current={selected ? 'page' : undefined}
                    className={classes(styles.row, selected && styles.selected)}
                    to={row.to}
                  >
                    <Icon aria-hidden className={styles.icon} size={15} />
                    <span className={styles.label}>{row.label}</span>
                    {touch ? (
                      <ChevronRight
                        aria-hidden
                        className={styles.end}
                        size={16}
                      />
                    ) : null}
                  </ScreenLink>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
