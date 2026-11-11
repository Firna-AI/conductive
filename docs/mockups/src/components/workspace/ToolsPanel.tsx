import type { ReactNode } from 'react'
import { LinkTabs } from '../common/LinkTabs'
import { PanelBar } from './PanelBar'
import { toolTabs, type ToolKey } from './tools'
import styles from './ToolsPanel.module.css'

/**
 * The desktop panel of the tools, with a tab for each tool that the app
 * offers. `links` gives the screens of the tabs for the workspace that owns
 * the panel, when they are not the screens of every workspace. A tab
 * without a screen there, or with null, stays static.
 */
export function ToolsPanel(props: {
  tool: ToolKey
  links?: Readonly<Partial<Record<ToolKey, string | null>>>
  children: ReactNode
}) {
  const tabs = toolTabs.map((tab) => ({
    label: tab.label,
    to: props.links ? (props.links[tab.key] ?? undefined) : tab.to,
    selected: tab.key === props.tool,
  }))
  return (
    <section aria-label="Tools" className={styles.panel}>
      <PanelBar>
        <LinkTabs label="Tools" tabs={tabs} />
      </PanelBar>
      <div className={styles.body}>{props.children}</div>
    </section>
  )
}
