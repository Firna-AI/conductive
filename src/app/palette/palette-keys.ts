import type { KeyPress, Platform } from '../services'

/** The modifier keys and the key of a press. */
export type KeyChord = Pick<
  KeyPress,
  'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'
>

/**
 * Whether a press is the palette key: ⌘K on a Mac, and Ctrl+K on Windows
 * and Linux. On a Mac, Ctrl+K is not the palette key, so it keeps its
 * meaning in text fields.
 */
export function isPaletteKey(press: KeyChord, platform: Platform): boolean {
  if (press.key.toLowerCase() !== 'k' || press.altKey || press.shiftKey) {
    return false
  }
  return platform === 'mac'
    ? press.metaKey && !press.ctrlKey
    : press.ctrlKey && !press.metaKey
}

/** What the page shows when the palette key comes. */
export interface KeyContext {
  platform: Platform
  /** The palette is open. */
  open: boolean
  /**
   * A dialog or a sheet other than the palette itself holds the focus,
   * such as a question of the page, or a filter sheet over the palette.
   */
  modal: boolean
  /** The press comes from the terminal of a workspace. */
  inTerminal: boolean
}

/**
 * What the palette key does: it closes an open palette, and opens a closed
 * one. It leaves the key to the page while another dialog or sheet holds
 * the focus, also over the open palette, and to the terminal on Windows
 * and Linux, where shells use Ctrl+K. An open that a menu refuses does
 * nothing either, as `PaletteController.show` says.
 */
export function paletteKeyOutcome(
  context: KeyContext,
): 'open' | 'close' | 'pass' {
  if (context.modal) return 'pass'
  if (context.open) return 'close'
  if (context.inTerminal && context.platform !== 'mac') return 'pass'
  return 'open'
}

/** The palette key as the Search row shows it. */
export function paletteKeyHint(platform: Platform): string {
  return platform === 'mac' ? '⌘K' : 'Ctrl K'
}

/** The palette key as `aria-keyshortcuts` names it. */
export function paletteKeyShortcut(platform: Platform): string {
  return platform === 'mac' ? 'Meta+K' : 'Control+K'
}
