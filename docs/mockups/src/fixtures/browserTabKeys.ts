import type { Shortcut } from '../components/common/KeyChips'

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

/** A modifier with each digit, such as Alt+1 to Alt+9. */
function digitKeys(modifier: string): Shortcut[] {
  return digits.map((digit) => `${modifier}${digit}`)
}

/**
 * The keys that decision 192 B leaves to the browser in a normal tab. The
 * user's answer of 10 November 2026 to decision 196, B with D, makes them
 * the keys that the browser uses on its system to select a tab or to open
 * its address bar: ⌘1 to ⌘9 and ⌘L on a Mac, and Ctrl+1 to Ctrl+9 and
 * Ctrl+L on Windows. On Linux, Chrome and Edge also use Alt+1 to Alt+9, and
 * Firefox uses Alt+1 to Alt+9 in place of Ctrl+1 to Ctrl+9.
 */
const macBrowserKeys = [...digitKeys('⌘'), '⌘L']

const windowsBrowserKeys = [...digitKeys('Ctrl+'), 'Ctrl+L']

const chromeLinuxBrowserKeys = [...windowsBrowserKeys, ...digitKeys('Alt+')]

const firefoxLinuxBrowserKeys = [...digitKeys('Alt+'), 'Ctrl+L']

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

/**
 * The keys that a normal Chrome tab on Windows or on Linux never gives the
 * page. Edge keeps the same keys.
 */
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
 * The keys that a normal Firefox tab on Linux keeps: its keys of the
 * Windows and Linux keyboard, and Ctrl+Q, which quits Firefox on Linux.
 * Firefox lets the page take Ctrl+Shift+T.
 */
const firefoxLinuxKept = [
  'Ctrl+N',
  'Ctrl+T',
  'Ctrl+W',
  'Ctrl+Shift+W',
  'Ctrl+Shift+P',
  'Ctrl+Tab',
  'Ctrl+Shift+Tab',
  'Ctrl+PgUp',
  'Ctrl+PgDn',
  'Ctrl+Shift+PgUp',
  'Ctrl+Shift+PgDn',
  'Ctrl+F4',
  'Ctrl+Q',
]

/**
 * The keys that the page cannot use in each normal browser tab that the
 * mockups draw: the keys that the browser keeps, with the keys that
 * decisions 192 B and 196 leave to it.
 */
export const tabKeys = {
  chromeMac: new Set([...chromeMacKept, ...macBrowserKeys]),
  firefoxMac: new Set([...firefoxMacKept, ...macBrowserKeys]),
  chromeWindows: new Set([...chromeWindowsKept, ...windowsBrowserKeys]),
  chromeLinux: new Set([...chromeWindowsKept, ...chromeLinuxBrowserKeys]),
  firefoxLinux: new Set([...firefoxLinuxKept, ...firefoxLinuxBrowserKeys]),
} as const satisfies Readonly<Record<string, ReadonlySet<Shortcut>>>
