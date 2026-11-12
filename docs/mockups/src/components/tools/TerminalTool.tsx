import type { ComponentProps } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Unplug } from 'lucide-react'
import type { TerminalLine } from '../../fixtures/terminal'
import { ActionButton } from '../common/actions'
import { TerminalTabs } from './TerminalTabs'
import { TerminalView } from './TerminalView'
import styles from './TerminalTool.module.css'

type TabsProps = Omit<ComponentProps<typeof TerminalTabs>, 'viewport'>

/**
 * The Terminal tool: the row of terminal tabs, then the shown terminal.
 * `tabs` is null for a workspace whose cloud computer software opens one
 * terminal only, which shows no row. A terminal whose connection ended
 * keeps its output, takes no input, and shows the Disconnected bar with
 * Reconnect under it, in the place of the keys on a phone.
 */
export function TerminalTool(props: {
  viewport: Viewport
  tabs: TabsProps | null
  lines: readonly TerminalLine[]
  prompt?: string
  disconnected?: boolean
}) {
  const mobile = props.viewport === 'mobile'
  const ended = props.disconnected ?? false
  return (
    <div className={styles.tool}>
      {props.tabs ? (
        <TerminalTabs {...props.tabs} viewport={props.viewport} />
      ) : null}
      <TerminalView
        cursor={!ended}
        extraKeys={mobile && !ended}
        lines={props.lines}
        prompt={ended ? undefined : props.prompt}
      />
      {ended ? (
        <div className={styles.ended} role="status">
          <span className={styles.endedLabel}>
            <Unplug aria-hidden size={13} />
            Disconnected
          </span>
          <ActionButton>Reconnect</ActionButton>
        </div>
      ) : null}
    </div>
  )
}
