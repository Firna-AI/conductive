import type { ComponentProps } from 'react'
import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { Unplug } from 'lucide-react'
import type { TerminalLine } from '../../fixtures/terminal'
import type { SharedSize } from '../../fixtures/terminals'
import { actionButton } from '../../entries/components/common/actions.mockup'
import type { TerminalTabs } from './TerminalTabs'
import { terminalTabs } from '../../entries/components/tools/TerminalTabs.mockup'
import { terminalView } from '../../entries/components/tools/TerminalView.mockup'
import { defined } from '../../defined'
import styles from './TerminalTool.module.css'

type TabsProps = Omit<ComponentProps<typeof TerminalTabs>, 'viewport'>

/**
 * The Terminal tool: the row of terminal tabs, then the shown terminal.
 * `tabs` is null for a workspace whose cloud computer software opens one
 * terminal only, which shows no row. A terminal whose connection ended
 * keeps its output, takes no input, and shows the Disconnected bar with
 * Reconnect under it, in the place of the keys on a phone. `shared` shows a
 * terminal at the size that another viewer set.
 */
export function TerminalTool(props: {
  viewport: Viewport
  tabs: TabsProps | null
  lines: readonly TerminalLine[]
  prompt?: string
  disconnected?: boolean
  shared?: SharedSize
}) {
  const mobile = props.viewport === 'mobile'
  const ended = props.disconnected ?? false
  return (
    <div className={styles.tool}>
      {props.tabs ? (
        <terminalTabs.Component
          moklyInstance="terminal-tabs"
          numbers={props.tabs.numbers}
          shown={props.tabs.shown}
          viewport={props.viewport}
          {...defined({
            atLimit: props.tabs.atLimit,
            closeTo: props.tabs.closeTo,
          })}
        />
      ) : null}
      <terminalView.Component
        cursor={!ended}
        extraKeys={mobile && !ended}
        lines={props.lines}
        moklyInstance="terminal-view"
        {...defined({
          prompt: ended ? undefined : props.prompt,
          shared: props.shared,
        })}
      />
      {ended ? (
        <div className={styles.ended} role="status">
          <span className={styles.endedLabel}>
            <Unplug aria-hidden size={13} />
            Disconnected
          </span>
          <actionButton.Component moklyInstance="reconnect">
            Reconnect
          </actionButton.Component>
        </div>
      ) : null}
    </div>
  )
}
