import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import { useControlSizes } from './ToolRoot'
import styles from './ToolButtons.module.css'

/**
 * A compact labelled button: a Firna button in the dense control size, with
 * a lighter label than Firna's own sizes. On a phone it is 44px high.
 */
export function ToolButton(props: {
  children: string
  onPress: () => void
  /** The spoken name, when it differs from the visible label. */
  accessibilityLabel?: string
  tone?: 'primary' | 'secondary'
  disabled?: boolean
  busy?: boolean
  /** The state of a toggle button, such as a held modifier key. */
  pressed?: boolean
}) {
  const control = useControlSizes()
  return (
    <Button
      accessibilityLabel={props.accessibilityLabel}
      busy={props.busy}
      disabled={props.disabled}
      labelStyle={{
        fontSize: control.labelSize,
        fontWeight: control.labelWeight,
        lineHeight: control.labelSize + 4,
      }}
      numberOfLines={1}
      onPress={props.onPress}
      pressed={props.pressed}
      size="sm"
      style={{ height: control.height, paddingHorizontal: 10 }}
      tone={props.tone ?? 'secondary'}
    >
      {props.children}
    </Button>
  )
}

/**
 * A compact icon-only button with a muted icon, for tool bars. On a phone its
 * box is 44px.
 */
export function ToolIconButton(props: {
  label: string
  icon: LucideIcon
  onPress: () => void
  disabled?: boolean
  busy?: boolean
  pressed?: boolean
}) {
  const Icon = props.icon
  const control = useControlSizes()
  return (
    <Button
      accessibilityLabel={props.label}
      boxSize={control.height}
      busy={props.busy}
      disabled={props.disabled}
      iconNode={<Icon className={styles.icon} size={15} />}
      onPress={props.onPress}
      pressed={props.pressed}
      shape="square"
      size="sm"
      tone="plain"
    />
  )
}
