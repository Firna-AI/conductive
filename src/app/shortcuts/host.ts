import type { ShortcutSystem } from '../../shared/shortcut-key'

export type ShortcutBrowser =
  'chrome' | 'edge' | 'firefox' | 'safari' | 'unknown'

export type ShortcutHost =
  | { readonly kind: 'mac-app'; readonly system: 'mac' }
  | {
      readonly kind: 'installed-app'
      readonly browser: 'chrome' | 'edge'
      readonly system: ShortcutSystem
    }
  | {
      readonly kind: 'browser-tab'
      readonly browser: ShortcutBrowser
      readonly system: ShortcutSystem
    }

/** Detects web hosts. The desktop entry supplies its own fixed host. */
export function detectShortcutHost(
  userAgent: string,
  displayMode: 'browser' | 'standalone' | 'window-controls-overlay',
): ShortcutHost {
  const system = /Mac|iPhone|iPad|iPod/.test(userAgent)
    ? 'mac'
    : /Windows/.test(userAgent)
      ? 'windows'
      : /Linux|Android/.test(userAgent)
        ? 'linux'
        : 'unknown'
  const browser = /Firefox\//.test(userAgent)
    ? 'firefox'
    : /Edg\//.test(userAgent)
      ? 'edge'
      : /Chrome\/|Chromium\//.test(userAgent)
        ? 'chrome'
        : /Safari\//.test(userAgent)
          ? 'safari'
          : 'unknown'
  if (
    (browser === 'chrome' || browser === 'edge') &&
    displayMode !== 'browser'
  ) {
    return { kind: 'installed-app', browser, system }
  }
  return { kind: 'browser-tab', browser, system }
}
