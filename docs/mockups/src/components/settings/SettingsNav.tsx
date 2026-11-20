import type { ReactNode } from 'react'
import { ArrowRight, ChevronRight, type LucideIcon } from 'lucide-react'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import styles from './SettingsNav.module.css'

export type SettingsNavRow = {
  key: string
  label: string
  icon: LucideIcon
  to: string
  selected: boolean
  /** The row opens another page, not a section of this list. */
  leaves?: boolean
}

export type SettingsNavGroup = {
  /** The heading of the group, such as Account or the name of the org. */
  title: string | undefined
  rows: readonly SettingsNavRow[]
  /** Where each row of the group leads on a phone, when it differs. */
  touchTo?: string
}

/**
 * The list of the sections of the settings, in groups. `panel` draws it in
 * a column of a desktop, with the selected row filled. `touch` draws it as
 * the first screen of a phone, with a chevron at the end of each row and
 * no row selected, because each row opens its section.
 */
export function SettingsNav(props: {
  groups: readonly SettingsNavGroup[]
  variant: 'panel' | 'touch'
  /** Rows above the groups, such as the way back to the workspaces. */
  header?: ReactNode
}) {
  const touch = props.variant === 'touch'
  return (
    <nav
      aria-label="Settings"
      className={classes(styles.nav, touch && styles.touch)}
    >
      {props.header}
      {props.groups.map((group, index) => (
        <div className={styles.group} key={group.title ?? index}>
          {group.title ? (
            <h3 className={styles.heading}>{group.title}</h3>
          ) : null}
          <ul className={styles.rows}>
            {group.rows.map((row) => {
              const Icon = row.icon
              const selected = row.selected && !touch
              return (
                <li key={row.key}>
                  <ScreenLink
                    aria-current={selected ? 'page' : undefined}
                    className={classes(styles.row, selected && styles.selected)}
                    to={touch ? (group.touchTo ?? row.to) : row.to}
                  >
                    <Icon aria-hidden className={styles.icon} size={15} />
                    <span className={styles.label}>{row.label}</span>
                    {row.leaves ? (
                      <ArrowRight
                        aria-hidden
                        className={styles.end}
                        size={13}
                      />
                    ) : touch ? (
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
