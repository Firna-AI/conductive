import { useCallback } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import {
  TintedTheme,
  type ButtonTint,
} from '../../docs/mockups/src/components/common/tint'
import { control, touchControl } from '../../docs/mockups/src/design/metrics'
import styles from './ActionButton.module.css'

/**
 * The key of the command that a button runs, as the app shows it in the
 * tooltip of the button and names it to a screen reader.
 */
export interface CommandKey {
  /** The tooltip, with the label and the key, such as "Archive (⇧⌘A)". */
  readonly title: string
  /** The key for `aria-keyshortcuts`, such as `Shift+Meta+A`. */
  readonly aria: string
}

/**
 * A compact labelled Firna button, as the mockups draw it: 26 px high in the
 * dense desktop layout, and 44 px high with `touch` on a phone. The `tint`
 * of a tinted bar fills the button in the tone of that bar. Without a tint,
 * the button takes the outline tone. `busy` shows that its write runs: the
 * button shows a spinner in place of its icon, and takes no press.
 * A button with `commandKey` shows that key in its tooltip and names it to
 * a screen reader. A Firna button takes neither, so a wrapper without a box
 * holds the tooltip, and the ref of the button holds the name.
 */
export function ActionButton(props: {
  children: string
  onPress: () => void
  icon?: LucideIcon
  touch?: boolean
  tint?: ButtonTint | null
  busy?: boolean
  commandKey?: CommandKey
  disabled?: boolean
}) {
  const size = props.touch ? touchControl : control
  const aria = props.commandKey?.aria
  const nameKey = useCallback(
    (element: unknown) => {
      if (!(element instanceof Element)) return
      if (aria === undefined) element.removeAttribute('aria-keyshortcuts')
      else element.setAttribute('aria-keyshortcuts', aria)
    },
    [aria],
  )
  const button = (
    <TintedTheme tint={props.tint}>
      <Button
        busy={props.busy}
        buttonRef={nameKey}
        disabled={props.disabled}
        icon={props.icon}
        labelStyle={{
          fontSize: size.labelSize,
          fontWeight: size.labelWeight,
          lineHeight: size.labelSize + 4,
        }}
        numberOfLines={1}
        onPress={props.onPress}
        size="sm"
        style={{ height: size.height, paddingHorizontal: 10 }}
        tone={props.tint ? 'primary' : 'secondary'}
      >
        {props.children}
      </Button>
    </TintedTheme>
  )
  if (!props.commandKey) return button
  return (
    <span className={styles.contents} title={props.commandKey.title}>
      {button}
    </span>
  )
}
