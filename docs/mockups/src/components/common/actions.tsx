import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import { control } from '../../design/metrics'
import { noop } from '../../noop'
import styles from './actions.module.css'

export type ActionTone = 'primary' | 'secondary' | 'plain'

/**
 * A compact labelled button: a Firna button in the dense control size, with
 * a lighter label than Firna's own sizes.
 */
export function ActionButton(props: {
  children: string
  /** The spoken name, when it differs from the visible label. */
  accessibilityLabel?: string
  icon?: LucideIcon
  tone?: ActionTone
  disabled?: boolean
  trailing?: ReactNode
}) {
  return (
    <Button
      accessibilityLabel={props.accessibilityLabel}
      disabled={props.disabled}
      icon={props.icon}
      labelStyle={{
        fontSize: control.labelSize,
        fontWeight: control.labelWeight,
        lineHeight: control.labelSize + 4,
      }}
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
 * quiet button has a fainter, smaller icon, for actions on every row.
 */
export function IconButton(props: {
  label: string
  icon: LucideIcon
  disabled?: boolean
  quiet?: boolean
}) {
  const Icon = props.icon
  return (
    <Button
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
      shape="square"
      size="sm"
      tone="plain"
    />
  )
}
