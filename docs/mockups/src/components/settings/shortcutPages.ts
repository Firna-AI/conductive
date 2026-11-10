import type { ShortcutHost } from '../../fixtures/shortcutHosts'
import { paths } from '../../paths'

/**
 * The pages of the Keyboard shortcuts tab of a host, which its links open:
 * the tab, a row that records in place of a shortcut, a row that records
 * one more shortcut, the tab after a few changes, and the question before
 * Reset all. The Mac app and a Chrome tab on a Mac draw every state. The
 * other hosts draw only the tab, so their rows link to no state.
 */
export type ShortcutPages = {
  tab: string
  recording?: string
  adding?: string
  changes?: string
  resetAll?: string
}

export const shortcutPages: Readonly<Record<ShortcutHost, ShortcutPages>> = {
  'mac-app': {
    tab: paths.macShortcuts,
    recording: paths.macShortcutsRecording,
    adding: paths.macShortcutsAdding,
    changes: paths.macShortcutsChanges,
    resetAll: paths.macShortcutsResetAll,
  },
  'chrome-mac': {
    tab: paths.accountShortcuts,
    recording: paths.accountShortcutsRecording,
    adding: paths.accountShortcutsAdding,
    changes: paths.accountShortcutsChanges,
    resetAll: paths.accountShortcutsResetAll,
  },
  'firefox-mac': { tab: paths.accountShortcutsFirefox },
  'chrome-windows': { tab: paths.accountShortcutsWindows },
  'chrome-linux': { tab: paths.accountShortcutsLinux },
  'firefox-linux': { tab: paths.accountShortcutsLinuxFirefox },
  'installed-mac': { tab: paths.accountShortcutsInstalled },
}
