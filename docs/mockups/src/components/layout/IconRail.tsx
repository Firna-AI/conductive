import { MockLink } from '@mokly/mokly'
import type { LucideIcon } from 'lucide-react'
import { FolderPlus, LayoutList, Plus } from 'lucide-react'
import { paths } from '../../paths'
import { classes } from '../common/classes'
import { Mark } from '../common/Mark'
import styles from './IconRail.module.css'

function RailLink(props: {
  icon: LucideIcon
  label: string
  to: string
  selected?: boolean
}) {
  const Icon = props.icon
  return (
    <MockLink
      aria-current={props.selected ? 'page' : undefined}
      aria-label={props.label}
      className={classes(styles.link, props.selected && styles.selected)}
      title={props.label}
      to={props.to}
    >
      <Icon size={17} />
    </MockLink>
  )
}

/** A narrow rail of app actions beside the workspace list. */
export function IconRail() {
  return (
    <nav aria-label="App" className={styles.rail}>
      <span className={styles.mark}>
        <Mark />
      </span>
      <RailLink
        icon={LayoutList}
        label="Workspaces"
        selected
        to={paths.shell}
      />
      <RailLink icon={Plus} label="New workspace" to={paths.newWorkspace} />
      <RailLink
        icon={FolderPlus}
        label="Add repository"
        to={paths.addRepository}
      />
    </nav>
  )
}
