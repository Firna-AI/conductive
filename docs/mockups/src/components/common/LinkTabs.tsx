import { MockLink } from '@mokly/mokly'
import type { IconComponent } from '@firna/ui'
import { Button } from '@firna/ui/button'
import { noop } from '../../noop'
import styles from './LinkTabs.module.css'

export type LinkTab = {
  label: string
  to: string
  icon?: IconComponent
  selected: boolean
}

/** A row of tabs. Each tab is a link to the screen that shows it. */
export function LinkTabs(props: { label: string; tabs: readonly LinkTab[] }) {
  return (
    <nav aria-label={props.label} className={styles.tabs}>
      {props.tabs.map((tab) => (
        <MockLink asChild key={tab.label} to={tab.to}>
          <Button
            icon={tab.icon}
            onPress={noop}
            size="sm"
            tone={tab.selected ? 'secondary' : 'plain'}
          >
            {tab.label}
          </Button>
        </MockLink>
      ))}
    </nav>
  )
}
