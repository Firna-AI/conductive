import { expect, test } from 'vitest'
import type { ShortcutHost } from '../../../app/shortcuts/host'
import { isFixedShortcut } from '../../../shared/shortcut-fixed'
import type { ShortcutKeyboard } from '../../../shared/shortcut-key'
import { dimmedKeysLine, shortcutGroups, type TabGroup } from './tab-rows'

const macApp: ShortcutHost = { kind: 'mac-app', system: 'mac' }
const chromeOnMac: ShortcutHost = {
  kind: 'browser-tab',
  browser: 'chrome',
  system: 'mac',
}

/** The labels of the rows of a group, with the kind of each row. */
function rowsOf(groups: readonly TabGroup[], label: string): string[] {
  const group = groups.find((item) => item.label === label)
  return (group?.rows ?? []).map((row) =>
    row.kind === 'command' ? row.command.label : `${row.label} (fixed)`,
  )
}

test('a browser tab leaves out the rows and the group of the Mac app, and each group lists its commands before its fixed keys', () => {
  const tab = shortcutGroups('mac', chromeOnMac)
  const app = shortcutGroups('mac', macApp)
  expect({
    tabGroups: tab.map((group) => group.label),
    tabView: rowsOf(tab, 'View'),
    appView: rowsOf(app, 'View'),
    appGroups: app.map((group) => group.label).slice(-3),
    chat: rowsOf(tab, 'Chat').slice(-5),
    tabPastes: rowsOf(tab, 'Text').filter((row) => row.startsWith('Paste')),
    appPastes: rowsOf(app, 'Text').filter((row) => row.startsWith('Paste')),
  }).toEqual({
    tabGroups: [
      'General',
      'View',
      'Navigation',
      'Workspace',
      'Chat',
      'Menus and palette',
      'Text',
    ],
    tabView: ['Hide or show the right column'],
    appView: ['Hide or show the sidebar', 'Hide or show the right column'],
    appGroups: ['Menus and palette', 'Text', 'Mac app'],
    chat: [
      'Stop the agent',
      'Copy concise transcript',
      'Copy full transcript',
      'Send (fixed)',
      'New line (fixed)',
    ],
    tabPastes: ['Paste (fixed)'],
    appPastes: ['Paste (fixed)', 'Paste and match style (fixed)'],
  })
})

test('each key that a fixed row shows is a fixed key of its keyboard, so the recorder refuses it', () => {
  const notFixed = (keyboard: ShortcutKeyboard) =>
    shortcutGroups(keyboard, macApp)
      .flatMap((group) => group.rows)
      .flatMap((row) => (row.kind === 'fixed' ? row.keys : []))
      .filter((key) => !isFixedShortcut(key, keyboard))
  expect({ mac: notFixed('mac'), other: notFixed('other') }).toEqual({
    mac: [],
    other: [],
  })
})

test('the line of dimmed keys names where they work in each browser tab, and other hosts dim no key', () => {
  const tab = (
    browser: 'chrome' | 'firefox',
    system: 'mac' | 'windows',
  ): ShortcutHost => ({ kind: 'browser-tab', browser, system })
  expect({
    chromeOnMac: dimmedKeysLine('mac', chromeOnMac),
    firefoxOnMac: dimmedKeysLine('mac', tab('firefox', 'mac')),
    chromeOnWindows: dimmedKeysLine('other', tab('chrome', 'windows')),
    firefoxOnWindows: dimmedKeysLine('other', tab('firefox', 'windows')),
    macApp: dimmedKeysLine('mac', macApp),
    installed: dimmedKeysLine('mac', {
      kind: 'installed-app',
      browser: 'chrome',
      system: 'mac',
    }),
  }).toEqual({
    chromeOnMac:
      'Dimmed keys work in the Mac app or in Conductive installed from Chrome.',
    firefoxOnMac: 'Dimmed keys work in the Mac app.',
    chromeOnWindows: 'Dimmed keys work in Conductive installed from Chrome.',
    firefoxOnWindows:
      'Dimmed keys work in Conductive installed from Chrome or Edge.',
    macApp: undefined,
    installed: undefined,
  })
})
