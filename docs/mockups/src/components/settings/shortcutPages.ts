import type { ShortcutHost } from '../../fixtures/shortcutHosts'
import { paths } from '../../paths'

/**
 * The pages of the Keyboard shortcuts tab of a host, which its links open:
 * the tab, a row that records, the tab after a few changes, and the
 * question before Reset all. The Mac app and a Chrome tab on a Mac draw
 * every state. The other hosts draw only the tab, so their rows link to no
 * state.
 */
export type ShortcutPages = {
  tab: string
  recording?: string
  changes?: string
  resetAll?: string
}

export const shortcutPages: Readonly<Record<ShortcutHost, ShortcutPages>> = {
  'mac-app': {
    tab: paths.macShortcuts,
    recording: paths.macShortcutsRecording,
    changes: paths.macShortcutsChanges,
    resetAll: paths.macShortcutsResetAll,
  },
  'chrome-mac': {
    tab: paths.accountShortcuts,
    recording: paths.accountShortcutsRecording,
    changes: paths.accountShortcutsChanges,
    resetAll: paths.accountShortcutsResetAll,
  },
  'firefox-mac': { tab: paths.accountShortcutsFirefox },
  'chrome-windows': { tab: paths.accountShortcutsWindows },
  'installed-mac': { tab: paths.accountShortcutsInstalled },
}
