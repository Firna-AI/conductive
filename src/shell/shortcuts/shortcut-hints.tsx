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
import { useShortcutKeyOf } from './shortcut-context'

/** The hint of the key of a command, as a control or a row shows it. */
export interface ShortcutHint {
  /** The key as its keyboard prints it, such as ⌥⌘B, or Alt+Shift+B. */
  readonly text: string
  /** The key for `aria-keyshortcuts`, such as `Alt+Meta+B`. */
  readonly aria: string
}

/** The tooltip of a control and the name of its key, as plain props. */
export interface ShortcutLabels {
  /** The label and the key, such as "Create PR (⇧⌘P)". */
  readonly title: string
  /** The key for `aria-keyshortcuts`, such as `Shift+Meta+P`. */
  readonly aria: string
}

/**
 * Gives the hint of the first key of a command that works where the page
 * runs, with the changes of the person, for each command that a part asks
 * for. The phone layout shows no hint, and a command without such a key
 * has none.
 */
function useShortcutHintOf(): (
  command: ShortcutCommandId,
) => ShortcutHint | undefined {
  const keyOf = useShortcutKeyOf()
  const services = useContext(ServicesContext)
  const phone = useViewport() === 'phone'
  return useCallback(
    (command: ShortcutCommandId) => {
      const key = keyOf(command)
      if (key === undefined || !services || phone) return undefined
      return {
        text: formatShortcut(key, services.platform),
        aria: ariaShortcut(key),
      }
    },
    [keyOf, services, phone],
  )
}

/** The hint of one command, as `useShortcutHintOf` gives it. */
export function useShortcutHint(
  command: ShortcutCommandId | undefined,
): ShortcutHint | undefined {
  const hintOf = useShortcutHintOf()
  return command === undefined ? undefined : hintOf(command)
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
 * The tooltip and the key name of a control that a part outside the shell
 * draws, such as a tab of the Files lists, which takes them as plain props.
 */
export function shortcutLabels(
  label: string,
  hint: ShortcutHint | undefined,
): ShortcutLabels | undefined {
  return hint === undefined
    ? undefined
    : { title: `${label} (${hint.text})`, aria: hint.aria }
}

/**
 * Gives the tooltip and the key name of a control of a part outside the
 * shell, for the command of the control and the label that it shows, as
 * `shortcutLabels` gives them. A part that draws the controls of several
 * commands with labels of its own takes it, such as the pull request bar,
 * whose Merge names its merge method.
 */
export function useShortcutLabelsOf(): (
  command: ShortcutCommandId,
  label: string,
) => ShortcutLabels | undefined {
  const hintOf = useShortcutHintOf()
  return useCallback(
    (command: ShortcutCommandId, label: string) =>
      shortcutLabels(label, hintOf(command)),
    [hintOf],
  )
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
