import { Button } from '@firna/ui/button'
import { Blocks, Paperclip, Plus, type LucideIcon } from 'lucide-react'
import { noop } from '../../../../../src/ui/noop'
import type { CapabilitiesControl } from '../capabilities/CapabilitiesButton'
import { capabilitiesLabel } from '../../../../../src/ui/components/capabilities/capabilitiesCopy'
import actions from '../../../../../src/ui/components/common/actions.module.css'
import { classes } from '../../../../../src/ui/components/common/classes'
import menu from '../../../../../src/ui/components/common/Menu.module.css'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import styles from '../../../../../src/ui/components/chat/ComposerMenu.module.css'

/** The spoken name of the button of the menu, and of the menu. */
const menuLabel = 'More options'

/** The menu of a phone composer: drawn open or not, and its screen. */
export type ComposerMenuState = {
  open: boolean
  /** The screen with the menu open, which a press on the button opens. */
  to?: string
}

/** One row of the menu, as a link to its screen when the mockups draw it. */
function Row(props: { icon: LucideIcon; label: string; to?: string }) {
  const Icon = props.icon
  const content = (
    <>
      <Icon aria-hidden className={menu.icon} size={14} />
      <span className={menu.label}>{props.label}</span>
    </>
  )
  if (props.to === undefined) return <div className={menu.item}>{content}</div>
  return (
    <ScreenLink className={classes(menu.item, styles.row)} to={props.to}>
      {content}
    </ScreenLink>
  )
}

/**
 * The one button of the bar of a phone composer, in place of the attach
 * button and the Capabilities icon (secrets decision 16 G). Its menu opens
 * above it, as the menu of the model picker does, with Attach files and
 * Capabilities. Later tools of the composer join the menu. A computer
 * keeps both buttons in the bar. `attachTo` is the screen of Attach files,
 * and `capabilities` the control that its row opens as a sheet.
 */
export function ComposerMenu(props: {
  state?: ComposerMenuState
  attachTo?: string
  capabilities?: CapabilitiesControl
}) {
  const control = useControlSizes()
  const open = props.state?.open === true
  const expanded = open || props.capabilities?.expanded === true
  const button = (
    <Button
      accessibilityLabel={menuLabel}
      boxSize={control.height}
      expanded={expanded}
      hasPopup="menu"
      iconNode={<Plus className={actions.icon} size={17} />}
      onPress={noop}
      shape="square"
      size="sm"
      tone="plain"
    />
  )
  const to = expanded ? undefined : props.state?.to
  return (
    <span className={styles.anchor}>
      {to ? (
        <ScreenLink asChild to={to}>
          {button}
        </ScreenLink>
      ) : (
        button
      )}
      {open ? (
        <div
          aria-label={menuLabel}
          className={classes(menu.menu, menu['above-start'])}
          role="group"
        >
          <Row icon={Paperclip} label="Attach files" to={props.attachTo} />
          {props.capabilities ? (
            <Row
              icon={Blocks}
              label={capabilitiesLabel}
              to={props.capabilities.to}
            />
          ) : null}
        </div>
      ) : null}
    </span>
  )
}
