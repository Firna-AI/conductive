import type { ReactNode } from 'react'
import { LinkTabs } from '../common/LinkTabs'
import { toolTabs, type ToolKey } from './tools'
import styles from './ToolPanel.module.css'

/** The desktop panel beside the chat: files, terminal, preview, desktop. */
export function ToolPanel(props: { tool: ToolKey; children: ReactNode }) {
  const tabs = toolTabs.map((tab) => ({
    label: tab.label,
    to: tab.to,
    icon: tab.icon,
    selected: tab.key === props.tool,
  }))
  return (
    <section aria-label="Workspace tools" className={styles.panel}>
      <div className={styles.tabs}>
        <LinkTabs label="Workspace tools" tabs={tabs} />
      </div>
      <div className={styles.body}>{props.children}</div>
    </section>
  )
}
