import { shortcutCommandIds } from '../../shared/shortcut-commands'
import {
  readShortcutKeyText,
  type ShortcutSystem,
} from '../../shared/shortcut-key'
import type { ShortcutContext } from './decision'
import type { ShortcutHost } from './host'
import { buildShortcutKeymap } from './keymap'
import type { ShortcutPress } from './keys'

export const key = readShortcutKeyText
export const macApp: ShortcutHost = { kind: 'mac-app', system: 'mac' }

export function tab(
  browser: 'chrome' | 'edge' | 'firefox' | 'safari' | 'unknown',
  system: ShortcutSystem = 'mac',
): ShortcutHost {
  return { kind: 'browser-tab', browser, system }
}

export function press(overrides: Partial<ShortcutPress> = {}): ShortcutPress {
  return {
    key: 'k',
    code: 'KeyK',
    metaKey: true,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    layoutModifiers: null,
    ...overrides,
  }
}

export function context(
  overrides: Partial<ShortcutContext> = {},
): ShortcutContext {
  return {
    press: press(),
    keyboard: 'mac',
    host: macApp,
    keymap: buildShortcutKeymap(overrides.keyboard ?? 'mac', []),
    offered: new Set(shortcutCommandIds),
    focus: 'page',
    recording: false,
    modal: null,
    menu: 'closed',
    ...overrides,
  }
}
