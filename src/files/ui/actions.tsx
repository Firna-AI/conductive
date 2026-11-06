import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import { useControlSizes } from './layout'
import styles from './actions.module.css'

/**
 * A compact labelled button: a Firna button in the dense control size, with
 * a lighter label than Firna's own sizes. On a phone it is 44 px high.
 */
export function ActionButton(props: {
  children: string
  onPress: () => void
  icon?: LucideIcon
  tone?: 'primary' | 'secondary'
  busy?: boolean
}) {
  const control = useControlSizes()
  return (
    <Button
      busy={props.busy}
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
    >
      {props.children}
    </Button>
  )
}

/**
 * A compact icon-only button with a muted icon, for bars and headers. A
 * quiet button has a fainter, smaller icon. Without `onPress` it is
 * disabled. On a phone its box is 44 px.
 */
export function IconButton(props: {
  label: string
  icon: LucideIcon
  onPress?: () => void
  quiet?: boolean
  busy?: boolean
}) {
  const Icon = props.icon
  const control = useControlSizes()
  return (
    <Button
      accessibilityLabel={props.label}
      boxSize={control.height}
      busy={props.busy}
      disabled={!props.onPress}
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
