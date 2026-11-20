import type { ReactNode } from 'react'
import { Button } from '@firna/ui/button'
import { Blocks } from 'lucide-react'
import { noop } from '../../noop'
import actions from '../common/actions.module.css'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { capabilitiesLabel } from './capabilitiesCopy'
import styles from './Capabilities.module.css'

/** The Capabilities icon of a message box, and its control when it is open. */
export type CapabilitiesControl = {
  /** The screen with the control open, which a press on the icon opens. */
  to?: string
  /**
   * The control, drawn open beside the icon on a computer. A view runs no
   * script, so the screen draws it.
   */
  panel?: ReactNode
  /** The control is open elsewhere, such as in a sheet on a phone. */
  expanded?: boolean
}

/** Where the open control lies: above the icon, from its start or its end. */
type Placement = 'above-start' | 'above-end'

/**
 * The small Capabilities icon beside a message box (secrets decisions 6
 * and 8). It shows its label on hover, as the tooltip of an icon button.
 * It opens the control of what the agents of the workspace can use, as a
 * popover above the icon on a computer, and as a sheet on a phone.
 */
export function CapabilitiesButton(
  props: CapabilitiesControl & { placement: Placement },
) {
  const control = useControlSizes()
  const open = props.panel !== undefined || props.expanded === true
  const button = (
    <Button
      accessibilityLabel={capabilitiesLabel}
      boxSize={control.height}
      expanded={open}
      hasPopup="dialog"
      iconNode={<Blocks className={actions.icon} size={15} />}
      onPress={noop}
      shape="square"
      size="sm"
      tone="plain"
    />
  )
  return (
    <span
      className={styles.anchor}
      title={open ? undefined : capabilitiesLabel}
    >
      {props.to && !open ? (
        <ScreenLink asChild to={props.to}>
          {button}
        </ScreenLink>
      ) : (
        button
      )}
      {props.panel ? (
        <div
          aria-label={capabilitiesLabel}
          className={classes(styles.popover, styles[props.placement])}
          role="dialog"
        >
          {props.panel}
        </div>
      ) : null}
    </span>
  )
}
