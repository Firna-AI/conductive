import type { ReactNode, Ref } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button, type ButtonProps } from '@firna/ui/button'
import { useControlSizes } from './controls'
import styles from './actions.module.css'

export type ActionTone = 'primary' | 'secondary' | 'plain' | 'danger'

/** The ref prop of a Firna button. */
export type ButtonRef = ButtonProps['buttonRef']

/** The mounted Firna button, which can take the focus. */
export type ButtonHandle =
  NonNullable<ButtonRef> extends Ref<infer Handle> ? Handle : never

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
 * a lighter label than Firna's own sizes. On a phone it is 44 px high. A
 * button without `onPress` is disabled.
 */
export function ActionButton(
  props: MenuTrigger & {
    children: string
    onPress?: () => void
    /** The spoken name, when it differs from the visible label. */
    accessibilityLabel?: string
    icon?: LucideIcon
    tone?: ActionTone
    disabled?: boolean
    /** The action runs: the button shows a spinner and ignores presses. */
    busy?: boolean
    trailing?: ReactNode
    buttonRef?: ButtonRef
  },
) {
  const control = useControlSizes()
  return (
    <Button
      {...triggerProps(props)}
      accessibilityLabel={props.accessibilityLabel}
      busy={props.busy}
      buttonRef={props.buttonRef}
      disabled={props.disabled}
      icon={props.icon}
      labelStyle={{
        fontSize: control.labelSize,
        fontWeight: control.labelWeight,
        lineHeight: control.labelSize + 4,
      }}
      numberOfLines={1}
      onPress={props.onPress}
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
 * A compact icon-only button with a muted icon, for rows and bars. On a
 * phone its box is 44 px.
 */
export function IconButton(
  props: MenuTrigger & {
    label: string
    icon: LucideIcon
    onPress?: () => void
    disabled?: boolean
    busy?: boolean
    buttonRef?: ButtonRef
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
      buttonRef={props.buttonRef}
      disabled={props.disabled}
      iconNode={<Icon className={styles.icon} size={15} />}
      onPress={props.onPress}
      shape="square"
      size="sm"
      tone="plain"
    />
  )
}
