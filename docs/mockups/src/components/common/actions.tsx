import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import { noop } from '../../noop'
import { useControlSizes } from './touch'
import styles from './actions.module.css'

export type ActionTone = 'primary' | 'secondary' | 'plain' | 'danger'

/** The state of a button that opens a menu. */
type MenuTrigger = {
  /** The button opens a menu, and `expanded` says whether it is open. */
  menu?: boolean
  expanded?: boolean
}

function triggerProps(props: MenuTrigger) {
  if (!props.menu) return {}
  return { expanded: props.expanded ?? false, hasPopup: 'menu' as const }
}

/**
 * A compact labelled button: a Firna button in the dense control size, with
 * a lighter label than Firna's own sizes. On a phone it is 44px high.
 */
export function ActionButton(
  props: MenuTrigger & {
    children: string
    /** The spoken name, when it differs from the visible label. */
    accessibilityLabel?: string
    icon?: LucideIcon
    tone?: ActionTone
    disabled?: boolean
    trailing?: ReactNode
  },
) {
  const control = useControlSizes()
  return (
    <Button
      {...triggerProps(props)}
      accessibilityLabel={props.accessibilityLabel}
      disabled={props.disabled}
      icon={props.icon}
      labelStyle={{
        fontSize: control.labelSize,
        fontWeight: control.labelWeight,
        lineHeight: control.labelSize + 4,
      }}
      numberOfLines={1}
      onPress={noop}
      size="sm"
      style={{ height: control.height, paddingHorizontal: 10 }}
      tone={props.tone ?? 'secondary'}
      trailing={props.trailing}
    >
      {props.children}
    </Button>
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
    disabled?: boolean
    quiet?: boolean
    /** The state of a toggle button, such as "+" while its form shows. */
    pressed?: boolean
  },
) {
  const Icon = props.icon
  const control = useControlSizes()
  return (
    <Button
      {...triggerProps(props)}
      accessibilityLabel={props.label}
      boxSize={control.height}
      disabled={props.disabled}
      iconNode={
        <Icon
          className={props.quiet ? styles.quiet : styles.icon}
          size={props.quiet ? 14 : 15}
        />
      }
      onPress={noop}
      pressed={props.pressed}
      shape="square"
      size="sm"
      tone="plain"
    />
  )
}
