import { useState, type ReactNode, type Ref, type SyntheticEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/common/actions.module.css'
import ui from './ui.module.css'

export type ActionTone = 'primary' | 'secondary' | 'plain' | 'danger'

/**
 * The look of an off Firna button: it is dimmed as Firna dims it, and the
 * pointer passes through it, so it shows no hover and no press.
 */
const offLook = { opacity: 0.55, pointerEvents: 'none' } as const

const ignore = () => undefined

/** Stops a press of a button that is off but keeps the focus. */
function stop(event: SyntheticEvent): void {
  event.preventDefault()
  event.stopPropagation()
}

/** A button that opens a menu says so, and whether the menu is open. */
type MenuTrigger = { menu?: boolean; expanded?: boolean }

function triggerProps(props: MenuTrigger) {
  if (!props.menu) return {}
  return { expanded: props.expanded ?? false, hasPopup: 'menu' as const }
}

/**
 * A compact labelled button: the Firna button in the dense size of the
 * design, with the lighter label of the mockups. On a phone it is 44px high.
 *
 * With `keepFocus`, a button that turns off while it has the focus keeps
 * it, as Save does after a save: a browser takes the focus from a natively
 * disabled button. Until the focus leaves, it stays a native button that
 * looks off, its wrapper says `aria-disabled`, and a press does nothing.
 * Then it is natively disabled.
 */
export function ActionButton(
  props: MenuTrigger & {
    children: string
    onPress: () => void
    /** The spoken name, when it differs from the visible label. */
    accessibilityLabel?: string
    icon?: LucideIcon
    tone?: ActionTone
    disabled?: boolean
    /** A button that turns off keeps the focus that it has. */
    keepFocus?: boolean
    /** A spinner shows while the action runs. */
    busy?: boolean
    trailing?: ReactNode
    buttonRef?: Ref<never>
  },
) {
  const control = useControlSizes()
  const [focused, setFocused] = useState(false)
  const held = props.keepFocus === true && props.disabled === true && focused
  const button = (
    <Button
      {...triggerProps(props)}
      accessibilityLabel={props.accessibilityLabel}
      busy={props.busy}
      buttonRef={props.buttonRef}
      disabled={props.disabled === true && !held}
      icon={props.icon}
      labelStyle={{
        fontSize: control.labelSize,
        fontWeight: control.labelWeight,
        lineHeight: control.labelSize + 4,
      }}
      numberOfLines={1}
      onPress={held ? ignore : props.onPress}
      size="sm"
      style={[
        { height: control.height, paddingHorizontal: 10 },
        held ? offLook : null,
      ]}
      tone={props.tone ?? 'secondary'}
      trailing={props.trailing}
    >
      {props.children}
    </Button>
  )
  if (props.keepFocus !== true) return button
  return (
    <span
      aria-disabled={held ? true : undefined}
      className={ui.contents}
      onBlur={() => {
        // A window that loses the focus keeps its focused element.
        if (document.hasFocus()) setFocused(false)
      }}
      onFocus={() => setFocused(true)}
      onKeyDownCapture={(event) => {
        if (held && (event.key === 'Enter' || event.key === ' ')) stop(event)
      }}
    >
      {button}
    </span>
  )
}

/**
 * A compact icon-only button with a muted icon, for bars and toolbars. A
 * quiet button has a fainter, smaller icon, for actions on every row. On a
 * phone its box is 44px.
 */
export function IconButton(
  props: MenuTrigger & {
    label: string
    icon: LucideIcon
    onPress: () => void
    disabled?: boolean
    /** A spinner shows while the action runs. */
    busy?: boolean
    quiet?: boolean
  },
) {
  const Icon = props.icon
  const control = useControlSizes()
  return (
    <Button
      {...triggerProps(props)}
      accessibilityLabel={props.label}
      boxSize={control.height}
      busy={props.busy}
      disabled={props.disabled}
      iconNode={
        <Icon
          className={props.quiet ? styles.quiet : styles.icon}
          size={props.quiet ? 14 : 15}
        />
      }
      onPress={props.onPress}
      shape="square"
      size="sm"
      tone="plain"
    />
  )
}
