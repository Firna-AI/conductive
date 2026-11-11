import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/common/actions.module.css'
import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import {
  ShortcutTip,
  useAriaShortcut,
  useShortcutHint,
} from '../../shell/shortcuts/shortcut-hints'

export type ActionTone = 'primary' | 'secondary' | 'plain' | 'danger'

/**
 * A compact labelled button: a Firna button in the dense control size, with
 * the lighter label of the mockups. On a phone it is 44 px high. A button
 * that runs a command of the keys names the key of that command in its
 * tooltip and to a screen reader.
 */
export function ActionButton(props: {
  children: string
  onPress: () => void
  accessibilityLabel?: string
  icon?: LucideIcon
  tone?: ActionTone
  disabled?: boolean
  busy?: boolean
  /** The command of the keys that the button runs. */
  shortcut?: ShortcutCommandId
}) {
  const control = useControlSizes()
  const hint = useShortcutHint(props.shortcut)
  const keyRef = useAriaShortcut(hint)
  const button = (
    <Button
      accessibilityLabel={props.accessibilityLabel}
      busy={props.busy}
      buttonRef={props.shortcut === undefined ? undefined : keyRef}
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
  if (props.shortcut === undefined) return button
  return (
    <ShortcutTip hint={hint} label={props.children}>
      {button}
    </ShortcutTip>
  )
}

/**
 * A compact icon-only button with a muted icon, for bars and toolbars. A
 * quiet button has a fainter, smaller icon, for actions on every tab. On a
 * phone its box is 44 px. A button that opens a menu says whether it is open.
 * A button that runs a command of the keys names the key of that command in
 * its tooltip and to a screen reader.
 */
export function IconButton(props: {
  label: string
  icon: LucideIcon
  onPress: () => void
  disabled?: boolean
  quiet?: boolean
  menu?: boolean
  expanded?: boolean
  /** The command of the keys that the button runs. */
  shortcut?: ShortcutCommandId
}) {
  const Icon = props.icon
  const control = useControlSizes()
  const hint = useShortcutHint(props.shortcut)
  const keyRef = useAriaShortcut(hint)
  const button = (
    <Button
      accessibilityLabel={props.label}
      boxSize={control.height}
      buttonRef={props.shortcut === undefined ? undefined : keyRef}
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
  if (props.shortcut === undefined) return button
  return (
    <ShortcutTip hint={hint} label={props.label}>
      {button}
    </ShortcutTip>
  )
}
