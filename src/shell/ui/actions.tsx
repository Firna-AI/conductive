import type { ReactNode, Ref } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/common/actions.module.css'

export type ActionTone = 'primary' | 'secondary' | 'plain' | 'danger'

/** A button that opens a menu says so, and whether the menu is open. */
type MenuTrigger = { menu?: boolean; expanded?: boolean }

function triggerProps(props: MenuTrigger) {
  if (!props.menu) return {}
  return { expanded: props.expanded ?? false, hasPopup: 'menu' as const }
}

/**
 * A compact labelled button: the Firna button in the dense size of the
 * design, with the lighter label of the mockups. On a phone it is 44px high.
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
    /** A spinner shows while the action runs. */
    busy?: boolean
    trailing?: ReactNode
    buttonRef?: Ref<never>
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
