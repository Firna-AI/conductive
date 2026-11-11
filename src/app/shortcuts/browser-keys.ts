import { shortcutDigits } from '../../shared/shortcut-commands'
import {
  readShortcutKeyText,
  type ShortcutKeyboard,
  type ShortcutKeyText,
  type ShortcutSystem,
} from '../../shared/shortcut-key'
import type { ShortcutBrowser, ShortcutHost } from './host'

type BrowserTable = Readonly<Record<ShortcutKeyboard, readonly string[]>> & {
  readonly own: Readonly<
    Record<Exclude<ShortcutSystem, 'unknown'>, readonly string[]>
  >
}

function digitKeys(modifier: string): string[] {
  return shortcutDigits.map((digit) => `${modifier}+${digit}`)
}

function tabAndAddressKeys(modifier: string): string[] {
  return [...digitKeys(modifier), `${modifier}+L`]
}

const chromium: BrowserTable = {
  own: {
    mac: tabAndAddressKeys('Meta'),
    windows: tabAndAddressKeys('Ctrl'),
    linux: [...tabAndAddressKeys('Ctrl'), ...digitKeys('Alt')],
  },
  mac: [
    'Meta+N',
    'Shift+Meta+N',
    'Meta+T',
    'Shift+Meta+T',
    'Meta+W',
    'Shift+Meta+W',
    'Meta+Q',
    'Ctrl+Tab',
    'Ctrl+Shift+Tab',
    'Shift+Meta+[',
    'Shift+Meta+]',
    'Alt+Meta+ArrowLeft',
    'Alt+Meta+ArrowRight',
    'Ctrl+PageUp',
    'Ctrl+PageDown',
  ],
  other: [
    'Ctrl+N',
    'Ctrl+Shift+N',
    'Ctrl+T',
    'Ctrl+Shift+T',
    'Ctrl+W',
    'Ctrl+F4',
    'Ctrl+Shift+W',
    'Alt+F4',
    'Ctrl+Tab',
    'Ctrl+Shift+Tab',
    'Ctrl+PageUp',
    'Ctrl+PageDown',
  ],
}

const firefox: BrowserTable = {
  own: {
    mac: tabAndAddressKeys('Meta'),
    windows: tabAndAddressKeys('Ctrl'),
    linux: [...digitKeys('Alt'), 'Ctrl+L'],
  },
  mac: [
    'Meta+N',
    'Meta+T',
    'Meta+W',
    'Shift+Meta+W',
    'Shift+Meta+P',
    'Meta+Q',
    'Ctrl+Tab',
    'Ctrl+Shift+Tab',
    'Ctrl+PageUp',
    'Ctrl+PageDown',
    'Ctrl+Shift+PageUp',
    'Ctrl+Shift+PageDown',
    'Alt+Meta+ArrowLeft',
    'Alt+Meta+ArrowRight',
    'Alt+Meta+ArrowUp',
    'Alt+Meta+ArrowDown',
    'Shift+Meta+[',
    'Shift+Meta+]',
  ],
  other: [
    'Ctrl+N',
    'Ctrl+T',
    'Ctrl+W',
    'Ctrl+Shift+W',
    'Ctrl+Shift+P',
    'Ctrl+Tab',
    'Ctrl+Shift+Tab',
    'Ctrl+PageUp',
    'Ctrl+PageDown',
    'Ctrl+Shift+PageUp',
    'Ctrl+Shift+PageDown',
    'Ctrl+F4',
  ],
}

const safari: BrowserTable = {
  own: { mac: [], windows: [], linux: [] },
  mac: [
    'Meta+N',
    'Shift+Meta+N',
    'Meta+T',
    'Shift+Meta+T',
    'Meta+W',
    'Meta+L',
    'Meta+R',
    'Meta+Q',
    'Ctrl+Tab',
    'Ctrl+Shift+Tab',
    'Ctrl+Home',
    'Shift+Meta+[',
    'Shift+Meta+]',
    ...shortcutDigits.map((digit) => `Meta+${digit}`),
  ],
  other: [],
}

type BrowserKeys = 'chromium' | 'firefox' | 'safari'
const tables: Readonly<Record<BrowserKeys, BrowserTable>> = {
  chromium,
  firefox,
  safari,
}

export type ShortcutKeyAvailability = 'available' | 'kept' | 'browser'

/** The tables remain separate so later system rules can extend one browser. */
function keptShortcutKeys(
  keyboard: ShortcutKeyboard,
  host: ShortcutHost,
): readonly ShortcutKeyText[] {
  if (host.kind !== 'browser-tab') return []
  const browsers = browserTables(host.browser)
  return [
    ...new Set(
      browsers.flatMap((browser) => {
        const keys = [...tables[browser][keyboard]]
        if (browser === 'firefox' && keyboard === 'other') {
          if (host.system !== 'windows') keys.push('Ctrl+Q')
          if (host.system !== 'linux') keys.push('Ctrl+Shift+Q')
        }
        return keys.map(readShortcutKeyText)
      }),
    ),
  ]
}

function browserTables(browser: ShortcutBrowser): readonly BrowserKeys[] {
  if (browser === 'unknown') return ['chromium', 'firefox', 'safari']
  return [browser === 'chrome' || browser === 'edge' ? 'chromium' : browser]
}

/** These keys reach the page, but the app leaves their browser action intact. */
function browserOwnShortcutKeys(
  keyboard: ShortcutKeyboard,
  host: ShortcutHost,
): readonly ShortcutKeyText[] {
  if (host.kind !== 'browser-tab') return []
  const systems =
    keyboard === 'mac'
      ? (['mac'] as const)
      : host.system === 'windows' || host.system === 'linux'
        ? [host.system]
        : (['windows', 'linux'] as const)
  return browserTables(host.browser).flatMap((browser) =>
    systems.flatMap((system) =>
      tables[browser].own[system].map(readShortcutKeyText),
    ),
  )
}

export function shortcutKeyAvailability(
  key: ShortcutKeyText,
  keyboard: ShortcutKeyboard,
  host: ShortcutHost,
): ShortcutKeyAvailability {
  if (keptShortcutKeys(keyboard, host).includes(key)) return 'kept'
  if (browserOwnShortcutKeys(keyboard, host).includes(key)) return 'browser'
  return 'available'
}
