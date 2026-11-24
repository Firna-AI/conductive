import type { ReactNode } from 'react'
import { linkTabs } from '../../entries/components/common/LinkTabs.mockup'
import { panelBar } from '../../entries/components/workspace/PanelBar.mockup'
import { tabPage, toolTabs, type ToolKey } from './tools'
import styles from '../../../../../src/ui/components/workspace/ToolsPanel.module.css'

/**
 * The desktop panel of the tools, with a tab for each tool that the app
 * offers. In the phone apps a tab opens the page of the phone apps, where
 * it has one, such as the Preview tool.
 */
export function ToolsPanel(props: {
  tool: ToolKey
  phoneApp?: boolean
  children: ReactNode
}) {
  const tabs = toolTabs.map((tab) => ({
    label: tab.label,
    to: tabPage(tab, props.phoneApp ?? false),
    selected: tab.key === props.tool,
  }))
  return (
    <section aria-label="Tools" className={styles.panel}>
      <panelBar.Component>
        <linkTabs.Component
          label="Tools"
          moklyInstance="tools-tabs"
          tabs={tabs}
        />
      </panelBar.Component>
      <div className={styles.body}>{props.children}</div>
    </section>
  )
}
