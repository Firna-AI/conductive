import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import { noop } from '../../noop'
import { useControlSizes } from './touch'
import { actionStyle } from './outlineTone'
import styles from './actions.module.css'

/**
 * The tone of an action button. `outline` is the border and the label of
 * `secondary` without its fill, for a button on a tinted bar.
 */
export type ActionTone =
  'primary' | 'secondary' | 'outline' | 'plain' | 'danger'

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
 * a lighter label than Firna's own sizes. On a phone it is 40px high.
 */
export function ActionButton(
  props: MenuTrigger & {
    children: string
    /** The spoken name, when it differs from the visible label. */
    accessibilityLabel?: string
    icon?: LucideIcon
    tone?: ActionTone
    disabled?: boolean
    /**
     * The action runs: a spinner replaces the icon before the label.
     * A press does nothing.
     */
    busy?: boolean
    trailing?: ReactNode
  },
) {
  const control = useControlSizes()
  const tone = props.tone ?? 'secondary'
  return (
    <Button
      {...triggerProps(props)}
      accessibilityLabel={props.accessibilityLabel}
      busy={props.busy}
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
      style={actionStyle(control.height, tone === 'outline')}
      tone={tone === 'outline' ? 'secondary' : tone}
      trailing={props.trailing}
    >
      {props.children}
    </Button>
  )
}

/**
 * A compact icon-only button with a muted icon, for bars and toolbars. A
 * quiet button has a fainter, smaller icon, for actions on every row. On a
 * phone its box is 40px.
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
