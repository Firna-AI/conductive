import type { Shortcut } from '../components/common/KeyChips'

/**
 * The keyboard of a host. The account keeps the changes of each keyboard
 * apart (decision 190). Windows and Linux share one keyboard. The mockups
 * draw Windows, because decisions 196 and 197 about Linux are open.
 */
export type Keyboard = 'mac' | 'windows'

/**
 * The browser pages of the Keyboard shortcuts tab: Chrome and Firefox in a
 * normal tab on a Mac, Chrome in a normal tab on Windows, and the installed
 * app of Chrome on a Mac.
 */
export const browserHosts = [
  'chrome-mac',
  'firefox-mac',
  'chrome-windows',
  'installed-mac',
] as const

type BrowserHost = (typeof browserHosts)[number]

/** Where the app runs: the Mac app, or a page of a browser. */
export type ShortcutHost = 'mac-app' | BrowserHost

/** The browsers of a normal tab that the mockups draw. */
export type TabBrowser = 'Chrome' | 'Firefox'

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

/**
 * The keys that decision 192 B leaves to the browser in a normal tab: ⌘1 to
 * ⌘9, which switch the browser's tabs, and ⌘L, its address bar.
 */
const macBrowserKeys = [...digits.map((digit) => `⌘${digit}`), '⌘L']

const windowsBrowserKeys = [...digits.map((digit) => `Ctrl+${digit}`), 'Ctrl+L']

/**
 * The keys that a normal Chrome tab on a Mac never gives the page, from
 * `kReservedCommandIds` of Chromium. Edge keeps the same keys.
 */
const chromeMacKept = [
  '⌘N',
  '⇧⌘N',
  '⌘T',
  '⇧⌘T',
  '⌘W',
  '⇧⌘W',
  '⌘Q',
  '⌃Tab',
  '⌃⇧Tab',
  '⇧⌘[',
  '⇧⌘]',
  '⌥⌘←',
  '⌥⌘→',
  '⌃PgUp',
  '⌃PgDn',
]

/**
 * The keys that a normal Firefox tab on a Mac keeps. ⇧⌘[ and ⇧⌘] reach the
 * page, but Firefox still switches the tab. Firefox lets the page take ⇧⌘T.
 */
const firefoxMacKept = [
  '⌘N',
  '⌘T',
  '⌘W',
  '⇧⌘W',
  '⇧⌘P',
  '⌘Q',
  '⌃Tab',
  '⌃⇧Tab',
  '⌃PgUp',
  '⌃PgDn',
  '⌃⇧PgUp',
  '⌃⇧PgDn',
  '⌥⌘←',
  '⌥⌘→',
  '⌥⌘↑',
  '⌥⌘↓',
  '⇧⌘[',
  '⇧⌘]',
]

/** The keys that a normal Chrome tab on Windows never gives the page. */
const chromeWindowsKept = [
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
  'Ctrl+PgDn',
  'Ctrl+PgUp',
]

/**
 * A normal tab of a browser: the browser, the keys that the page cannot use
 * there, and whether the browser installs the app in its own window.
 */
export type BrowserTab = {
  browser: TabBrowser
  /** The keys that the browser keeps, with those that decision 192 B leaves to it. */
  kept: ReadonlySet<Shortcut>
  /** Chrome and Edge install the app. Firefox has no installed app on a Mac. */
  installs: boolean
}

type HostKeys = {
  keyboard: Keyboard
  /** A normal tab, where the browser keeps some keys. Elsewhere every key works. */
  tab?: BrowserTab
}

/**
 * The keys of each host, from the key research of 10 November 2026. The
 * Mac app and an installed app of Chrome or Edge give the page every key.
 */
const hosts: Readonly<Record<ShortcutHost, HostKeys>> = {
  'mac-app': { keyboard: 'mac' },
  'installed-mac': { keyboard: 'mac' },
  'chrome-mac': {
    keyboard: 'mac',
    tab: {
      browser: 'Chrome',
      kept: new Set([...chromeMacKept, ...macBrowserKeys]),
      installs: true,
    },
  },
  'firefox-mac': {
    keyboard: 'mac',
    tab: {
      browser: 'Firefox',
      kept: new Set([...firefoxMacKept, ...macBrowserKeys]),
      installs: false,
    },
  },
  'chrome-windows': {
    keyboard: 'windows',
    tab: {
      browser: 'Chrome',
      kept: new Set([...chromeWindowsKept, ...windowsBrowserKeys]),
      installs: true,
    },
  },
}

export function keyboardOf(host: ShortcutHost): Keyboard {
  return hosts[host].keyboard
}

/** The normal tab of a host, or none where every key works. */
export function browserTabOf(host: ShortcutHost): BrowserTab | undefined {
  return hosts[host].tab
}

/** Whether a key works where the page runs. */
export function worksIn(host: ShortcutHost, shortcut: Shortcut): boolean {
  return !hosts[host].tab?.kept.has(shortcut)
}
