import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import type { ShortcutKeyboard } from '../../shared/shortcut-key'
import { shortcutKeyAvailability } from './browser-keys'
import { commandInHost } from './defaults'
import type { ShortcutHost } from './host'
import type { ShortcutKeymap } from './keymap'
import {
  matchesShortcut,
  restoreLayoutModifiers,
  type ShortcutPress,
} from './keys'
import { isLayoutSwitchKey } from './layout-switch'
import {
  isTextShortcut,
  terminalKeepsShortcut,
  type ShortcutFocus,
} from './text-keys'

export interface ShortcutContext {
  readonly press: ShortcutPress
  readonly keyboard: ShortcutKeyboard
  readonly host: ShortcutHost
  readonly keymap: ShortcutKeymap
  readonly offered: ReadonlySet<ShortcutCommandId>
  readonly focus: ShortcutFocus
  readonly recording: boolean
  /** Only the command that owns this layer may run. */
  readonly modal: ShortcutCommandId | null
  readonly menu: 'closed' | 'closable' | 'blocked'
}

/**
 * The caller closes a menu first, then consumes the press before it runs.
 * A repeat of a held command key is consumed too, and runs nothing.
 * An unmatched restored press stops without a command, except protected input.
 */
export type ShortcutDecision =
  | { readonly kind: 'pass' }
  | { readonly kind: 'stop'; readonly closeMenu: boolean }
  | {
      readonly kind: 'command'
      readonly command: ShortcutCommandId
      readonly closeMenu: boolean
    }
  | { readonly kind: 'repeat'; readonly command: ShortcutCommandId }

/** A held key runs its command once, and no repeat reaches the page. */
export function decideShortcut(context: ShortcutContext): ShortcutDecision {
  if (!context.press.repeat) return decideFirstPress(context)
  const first = decideFirstPress({
    ...context,
    press: { ...context.press, repeat: false },
  })
  return first.kind === 'command'
    ? { kind: 'repeat', command: first.command }
    : first
}

function decideFirstPress(context: ShortcutContext): ShortcutDecision {
  const { keyboard, host, focus } = context
  const press = restoreLayoutModifiers(context.press)
  const unmatched: ShortcutDecision =
    press.layoutModifiers != null
      ? { kind: 'stop', closeMenu: context.menu === 'closable' }
      : { kind: 'pass' }
  if (
    isLayoutSwitchKey(press.key) ||
    press.isComposing ||
    context.recording ||
    focus === 'frame' ||
    context.menu === 'blocked'
  )
    return { kind: 'pass' }
  if (focus === 'terminal' && terminalKeepsShortcut(press, keyboard))
    return { kind: 'pass' }
  if (
    (focus === 'text' || focus === 'single-line-text') &&
    isTextShortcut(press, keyboard, host, focus)
  )
    return unmatched
  for (const [command, keys] of context.keymap) {
    if (!context.offered.has(command) || !commandInHost(command, host)) continue
    if (context.modal !== null && context.modal !== command) continue
    if (
      keys.some(
        (key) =>
          matchesShortcut(key, press) &&
          shortcutKeyAvailability(key, keyboard, host) === 'available',
      )
    ) {
      return {
        kind: 'command',
        command,
        closeMenu: context.menu === 'closable',
      }
    }
  }
  return unmatched
}
