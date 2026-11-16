import type { ReactNode } from 'react'
import { linkTabs } from '../../entries/components/common/LinkTabs.mockup'
import { PanelBar } from './PanelBar'
import { toolTabs, type ToolKey } from './tools'
import styles from './ToolsPanel.module.css'

/**
 * The desktop panel of the tools, with a tab for each tool that the app
 * offers.
 */
export function ToolsPanel(props: { tool: ToolKey; children: ReactNode }) {
  const tabs = toolTabs.map((tab) => ({
    label: tab.label,
    to: tab.to,
    selected: tab.key === props.tool,
  }))
  return (
    <section aria-label="Tools" className={styles.panel}>
      <PanelBar>
        <linkTabs.Component
          label="Tools"
          moklyInstance="tools-tabs"
          tabs={tabs}
        />
      </PanelBar>
      <div className={styles.body}>{props.children}</div>
    </section>
  )
}
