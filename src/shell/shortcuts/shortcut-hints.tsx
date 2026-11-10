import {
  useCallback,
  useContext,
  type ReactNode,
  type RefCallback,
} from 'react'
import { ariaShortcut, formatShortcut } from '../../app/shortcuts/keys'
import { ServicesContext } from '../../app/services'
import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import ui from '../ui/ui.module.css'
import { useViewport } from '../ui/viewport'
import { useShortcutKey } from './shortcut-context'

/** The hint of the key of a command, as a control or a row shows it. */
export interface ShortcutHint {
  /** The key as its keyboard prints it, such as ⌥⌘B, or Alt+Shift+B. */
  readonly text: string
  /** The key for `aria-keyshortcuts`, such as `Alt+Meta+B`. */
  readonly aria: string
}

/**
 * The hint of the first key of the command that works where the page runs,
 * with the changes of the person. The phone layout shows no hint, and a
 * command without such a key has none.
 */
export function useShortcutHint(
  command: ShortcutCommandId | undefined,
): ShortcutHint | undefined {
  const key = useShortcutKey(command)
  const services = useContext(ServicesContext)
  const phone = useViewport() === 'phone'
  if (key === undefined || !services || phone) return undefined
  return {
    text: formatShortcut(key, services.platform),
    aria: ariaShortcut(key),
  }
}

/**
 * A ref that names the key of the hint on the element of a control, for a
 * library control that takes no `aria-keyshortcuts` of its own, such as a
 * Firna button. Without a hint, it removes the name.
 */
export function useAriaShortcut(
  hint: ShortcutHint | undefined,
): RefCallback<unknown> {
  const aria = hint?.aria
  return useCallback(
    (element: unknown) => {
      if (!(element instanceof Element)) return
      if (aria === undefined) element.removeAttribute('aria-keyshortcuts')
      else element.setAttribute('aria-keyshortcuts', aria)
    },
    [aria],
  )
}

/** The tooltip of a control: its label and the key, such as "Stop (⌃⌘⌫)". */
export function shortcutTip(
  label: string,
  hint: ShortcutHint | undefined,
): string | undefined {
  return hint === undefined ? undefined : `${label} (${hint.text})`
}

/**
 * The tooltip of a control of a library that takes no `title`, such as a
 * Firna button. The wrapper has no box, so the control keeps its layout.
 */
export function ShortcutTip(props: {
  label: string
  hint: ShortcutHint | undefined
  children: ReactNode
}) {
  return (
    <span className={ui.contents} title={shortcutTip(props.label, props.hint)}>
      {props.children}
    </span>
  )
}
