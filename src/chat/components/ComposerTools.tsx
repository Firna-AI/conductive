import { useCallback, useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import styles from '../../ui/components/capabilities/Capabilities.module.css'
import actions from '../../ui/components/common/actions.module.css'
import { classes } from '../../ui/components/common/classes'
import { useControlSizes } from '../../ui/components/common/touch'
import { useMenuLayer } from '../../shell/ui/layers'
import { useDismiss, useLayerFocus } from '../../shell/ui/Overlay'

/**
 * A tool of a composer that its host gives, such as Capabilities. A
 * computer shows its icon in the bar of the composer. A phone shows it as a
 * row of the menu of the + button, and opens its control as a sheet.
 */
export interface ComposerTool {
  /** A key that stays the same while the composer shows. */
  key: string
  /**
   * The name of the tool: the tooltip and the spoken name of its icon, its
   * row in the menu of a phone, and the title of its sheet.
   */
  label: string
  icon: LucideIcon
  /**
   * The control of the tool, drawn open. A sheet has its own title, so
   * `sheet` says that the control leaves out its title.
   */
  render: (sheet: boolean) => ReactNode
}

/** Where the open control of a tool lies: above its icon, from a side. */
export type ToolPlacement = 'above-start' | 'above-end'

/**
 * The open control of a tool above its icon, as an open menu of the app
 * lies. The focus moves into it as it opens, and back as it closes.
 */
function ToolPopover(props: {
  label: string
  placement: ToolPlacement
  children: ReactNode
}) {
  const popover = useRef<HTMLDivElement>(null)
  useLayerFocus(popover, { modal: false })
  return (
    <div
      aria-label={props.label}
      className={classes(styles.popover, styles[props.placement])}
      ref={popover}
      role="dialog"
      tabIndex={-1}
    >
      {props.children}
    </div>
  )
}

/**
 * The icon of a tool in the bar of a composer on a computer, such as the
 * Blocks icon of Capabilities. It shows its label on hover, as a native
 * tooltip, and a press opens its control above the icon. A second press, a
 * press outside, Escape, and the key of the command palette close it.
 * While the icon is off, the control does not show.
 */
export function ToolButton(props: {
  tool: ComposerTool
  placement: ToolPlacement
  disabled?: boolean
}) {
  const { tool } = props
  const control = useControlSizes()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const shown = open && props.disabled !== true
  useDismiss(shown, anchor, close)
  useMenuLayer(shown, () => {
    close()
    return true
  })
  const Icon = tool.icon
  return (
    <span
      className={styles.anchor}
      ref={anchor}
      title={shown ? undefined : tool.label}
    >
      <Button
        accessibilityLabel={tool.label}
        boxSize={control.height}
        disabled={props.disabled}
        expanded={shown}
        hasPopup="dialog"
        iconNode={<Icon className={actions.icon} size={15} />}
        onPress={() => setOpen((value) => !value)}
        shape="square"
        size="sm"
        tone="plain"
      />
      {shown ? (
        <ToolPopover label={tool.label} placement={props.placement}>
          {tool.render(false)}
        </ToolPopover>
      ) : null}
    </span>
  )
}
