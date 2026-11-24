import type { ReactNode } from 'react'
import { usePhoneAppProp } from '../components/phone/PhoneApp'
import type { ToolKey } from '../components/workspace/tools'
import { toolsPanel } from '../entries/components/workspace/ToolsPanel.mockup'

/**
 * The tools panel of the desktop layout of a workspace, with its tool. In
 * the phone apps on a tablet its tabs take the mark of the phone apps.
 */
export function WorkspaceToolsPanel(props: {
  tool: ToolKey
  children: ReactNode
}) {
  const phoneApp = usePhoneAppProp()
  return (
    <toolsPanel.Component
      moklyInstance="tools-panel"
      tool={props.tool}
      {...phoneApp}
    >
      {props.children}
    </toolsPanel.Component>
  )
}
