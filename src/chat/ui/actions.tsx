import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/common/actions.module.css'

export type ActionTone = 'primary' | 'secondary' | 'plain' | 'danger'

/**
 * A compact labelled button: a Firna button in the dense control size, with
 * the lighter label of the mockups. On a phone it is 44 px high.
 */
export function ActionButton(props: {
  children: string
  onPress: () => void
  accessibilityLabel?: string
  icon?: LucideIcon
  tone?: ActionTone
  disabled?: boolean
  busy?: boolean
}) {
  const control = useControlSizes()
  return (
    <Button
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
 * A compact icon-only button with a muted icon, for bars and toolbars. A
 * quiet button has a fainter, smaller icon, for actions on every tab. On a
 * phone its box is 44 px. A button that opens a menu says whether it is open.
 */
export function IconButton(props: {
  label: string
  icon: LucideIcon
  onPress: () => void
  disabled?: boolean
  quiet?: boolean
  menu?: boolean
  expanded?: boolean
}) {
  const Icon = props.icon
  const control = useControlSizes()
  return (
    <Button
      accessibilityLabel={props.label}
      boxSize={control.height}
      disabled={props.disabled}
      expanded={props.menu ? (props.expanded ?? false) : undefined}
      hasPopup={props.menu ? 'menu' : undefined}
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
