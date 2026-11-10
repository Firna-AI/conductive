import type { Shortcut } from '../components/common/KeyChips'
import { tabKeys } from './browserTabKeys'

/**
 * The keyboard of a host. The account keeps the changes of each keyboard
 * apart (decision 190). Windows and Linux share one keyboard, `windows`, so
 * a page on Linux shows the keys of Windows. The user's answer of 10
 * November 2026 to decision 197, D, keeps these keys: they also work for a
 * person whose Linux layout switches on Alt+Shift.
 */
export type Keyboard = 'mac' | 'windows'

/**
 * The browser pages of the Keyboard shortcuts tab: Chrome and Firefox in a
 * normal tab on a Mac and on Linux, Chrome in a normal tab on Windows, and
 * the installed app of Chrome on a Mac.
 */
export const browserHosts = [
  'chrome-mac',
  'firefox-mac',
  'chrome-windows',
  'chrome-linux',
  'firefox-linux',
  'installed-mac',
] as const

type BrowserHost = (typeof browserHosts)[number]

/** Where the app runs: the Mac app, or a page of a browser. */
export type ShortcutHost = 'mac-app' | BrowserHost

/** The browsers of a normal tab that the mockups draw. */
export type TabBrowser = 'Chrome' | 'Firefox'

/**
 * A normal tab of a browser: the browser, the keys that the page cannot use
 * there, and whether the browser installs the app in its own window.
 */
export type BrowserTab = {
  browser: TabBrowser
  /**
   * The keys that the browser keeps, with those that decisions 192 B and
   * 196 leave to it.
   */
  kept: ReadonlySet<Shortcut>
  /**
   * Chrome and Edge install the app. Firefox installs no app that gives the
   * page every key.
   */
  installs: boolean
}

type HostKeys = {
  keyboard: Keyboard
  /** A normal tab, where the browser keeps some keys. Elsewhere every key works. */
  tab?: BrowserTab
}

/**
 * The keys of each host, from the key research of 10 November 2026 and the
 * user's answer to decision 196 of the same day. The Mac app and an
 * installed app of Chrome or Edge give the page every key.
 */
const hosts: Readonly<Record<ShortcutHost, HostKeys>> = {
  'mac-app': { keyboard: 'mac' },
  'installed-mac': { keyboard: 'mac' },
  'chrome-mac': {
    keyboard: 'mac',
    tab: { browser: 'Chrome', kept: tabKeys.chromeMac, installs: true },
  },
  'firefox-mac': {
    keyboard: 'mac',
    tab: { browser: 'Firefox', kept: tabKeys.firefoxMac, installs: false },
  },
  'chrome-windows': {
    keyboard: 'windows',
    tab: { browser: 'Chrome', kept: tabKeys.chromeWindows, installs: true },
  },
  'chrome-linux': {
    keyboard: 'windows',
    tab: { browser: 'Chrome', kept: tabKeys.chromeLinux, installs: true },
  },
  'firefox-linux': {
    keyboard: 'windows',
    tab: { browser: 'Firefox', kept: tabKeys.firefoxLinux, installs: false },
  },
}

/**
 * The host of a page that does not choose one: the Mac app, or else a
 * normal Chrome tab on a Mac, which the browser pages draw. Only the
 * Keyboard shortcuts tab draws the other hosts.
 */
export function pageHost(macApp: boolean): ShortcutHost {
  return macApp ? 'mac-app' : 'chrome-mac'
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
