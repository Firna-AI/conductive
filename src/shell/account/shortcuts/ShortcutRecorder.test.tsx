// @vitest-environment happy-dom

import { describe, expect, onTestFinished, test, vi } from 'vitest'
import { ACCOUNT_PATHS } from '../../../shared/account'
import { accessibleName, byRole } from '../../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT } from '../../../test-support/mount'
import { palette } from '../../palette/palette-test-kit'
import { pressShortcut } from '../../shortcuts/shortcut-test-kit'
import { click, settle } from '../../test-mount'
import {
  controlsOf,
  linesOf,
  openShortcutsTab,
  replyWith,
  rowOf,
  savesOf,
  type TabPlace,
} from './shortcuts-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/**
 * A press of a test: its key text, with the key and the code that take the
 * place of those of a US keyboard.
 */
interface Press {
  readonly text: string
  readonly key?: string
  readonly code?: string
}

/** Presses the keys in their order, on the focused element unless `target` is given. */
function pressAll(presses: readonly Press[], target?: EventTarget): void {
  for (const { text, ...options } of presses) {
    pressShortcut(text, target, options)
  }
}

const linux: TabPlace = { keyboard: 'other', system: 'linux' }

describe('the recorder of the Keyboard shortcuts tab', () => {
  // On Linux, the Alt+Shift layout switch takes the modifier that goes down
  // second: its press arrives as GroupNext, on the physical key of that
  // modifier, and the page hears no such modifier. The keys then type the
  // characters of the other layout, such as the л of K on a Russian layout.
  test.each([
    {
      host: 'a Mac',
      held: 'with no layout switch',
      place: { keyboard: 'mac', system: 'mac' },
      replaces: 'Command K',
      layoutSwitch: [],
      press: { text: 'Shift+Meta+K' },
      recorded: 'Shift+Meta+K',
      spoken: 'Shift Command K',
    },
    {
      // Alt goes down first, so the switch takes Shift.
      host: 'Linux',
      held: 'while the layout switch takes Shift',
      place: linux,
      replaces: 'Control K',
      layoutSwitch: [{ text: 'Alt+K', key: 'GroupNext', code: 'ShiftLeft' }],
      press: { text: 'Alt+K', key: 'л' },
      recorded: 'Alt+Shift+K',
      spoken: 'Alt Shift K',
    },
    {
      // Shift goes down first, so the switch takes Alt. A Tab with a
      // modifier records, also when the switch takes that modifier.
      host: 'Linux',
      held: 'while the layout switch takes Alt',
      place: linux,
      replaces: 'Control K',
      layoutSwitch: [{ text: 'Shift+Tab', key: 'GroupNext', code: 'AltLeft' }],
      press: { text: 'Shift+Tab' },
      recorded: 'Alt+Shift+Tab',
      spoken: 'Alt Shift Tab',
    },
  ] satisfies {
    host: string
    held: string
    place: TabPlace
    replaces: string
    layoutSwitch: Press[]
    press: Press
    recorded: string
    spoken: string
  }[])(
    'in a Chrome tab on $host, $held, a recorded key saves to the account, takes the focus, and runs its command',
    async ({ place, replaces, layoutSwitch, press, recorded, spoken }) => {
      const { server } = await openShortcutsTab([], place)
      // The window loses the focus at the end, which lets go of the switch.
      onTestFinished(() => {
        window.dispatchEvent(new Event('blur'))
      })
      click(byRole('button', `Change ${replaces} for Command palette`))
      const change = { command: 'command-palette', keys: [recorded] } as const
      replyWith(server, [change], place.keyboard)
      // The recorder has the focus, so the presses go to it.
      pressAll([...layoutSwitch, press])
      await settle()
      const row = rowOf('General', 'Command palette')
      const focused = accessibleName(document.activeElement ?? document.body)
      // The same press runs the command, while the switch stays down.
      pressAll([press], document.body)
      expect({
        saves: await savesOf(server),
        row: controlsOf(row),
        focused,
        palette: palette() !== null,
      }).toEqual({
        saves: [{ keyboard: place.keyboard, changes: [change] }],
        row: [
          'Reset Command palette',
          `Change ${spoken} for Command palette`,
          'Add shortcut for Command palette',
        ],
        focused: `Change ${spoken} for Command palette`,
        palette: true,
      })
    },
  )

  test('Replace moves a key that another command holds to the row in one save', async () => {
    const { server } = await openShortcutsTab()
    click(byRole('button', 'Change Option Command / for Keyboard shortcuts'))
    const row = rowOf('General', 'Keyboard shortcuts')
    // The / of the keypad types /, so with ⌘ it is the ⌘/ of Model picker.
    pressShortcut('Meta+/', undefined, { code: 'NumpadDivide' })
    const keypad = linesOf(row)
    click(byRole('button', 'Cancel', row))
    click(byRole('button', 'Change Option Command / for Keyboard shortcuts'))
    pressShortcut('Meta+/')
    const asked = { lines: linesOf(row), controls: controlsOf(row) }
    const before = (await savesOf(server)).length
    replyWith(server, [
      { command: 'keyboard-shortcuts', keys: ['Meta+/'] },
      { command: 'model-picker', keys: [] },
    ])
    click(
      byRole(
        'button',
        'Replace: move Command / from Model picker to Keyboard shortcuts',
      ),
    )
    await settle()
    expect({
      keypad,
      asked,
      before,
      saves: await savesOf(server),
      shortcuts: controlsOf(rowOf('General', 'Keyboard shortcuts')),
      model: controlsOf(rowOf('Chat', 'Model picker')),
    }).toEqual({
      keypad: ['Model picker uses Command /.'],
      asked: {
        lines: ['Model picker uses Command /.'],
        controls: [
          'Replace: move Command / from Model picker to Keyboard shortcuts',
          'Cancel',
        ],
      },
      before: 0,
      saves: [
        {
          keyboard: 'mac',
          changes: [
            { command: 'keyboard-shortcuts', keys: ['Meta+/'] },
            { command: 'model-picker', keys: [] },
          ],
        },
      ],
      shortcuts: [
        'Reset Keyboard shortcuts',
        'Change Command / for Keyboard shortcuts',
        'Add shortcut for Keyboard shortcuts',
      ],
      model: ['Reset Model picker', 'Add shortcut for Model picker'],
    })
  })

  test('Remove takes the key that the recorder replaces off the command', async () => {
    const { server } = await openShortcutsTab()
    click(byRole('button', 'Change Option Command / for Keyboard shortcuts'))
    replyWith(server, [{ command: 'keyboard-shortcuts', keys: [] }])
    click(byRole('button', 'Remove Option Command / from Keyboard shortcuts'))
    await settle()
    expect({
      saves: await savesOf(server),
      row: controlsOf(rowOf('General', 'Keyboard shortcuts')),
    }).toEqual({
      saves: [
        {
          keyboard: 'mac',
          changes: [{ command: 'keyboard-shortcuts', keys: [] }],
        },
      ],
      row: ['Reset Keyboard shortcuts', 'Add shortcut for Keyboard shortcuts'],
    })
  })

  test('the recorder refuses a fixed key, names it, and waits for another key', async () => {
    const { server } = await openShortcutsTab()
    click(byRole('button', 'Change Command K for Command palette'))
    const row = rowOf('General', 'Command palette')
    pressShortcut('Meta+Z')
    const named = linesOf(row)
    // Only the Mac app lists Reload, and the Mac keyboard keeps ⌘R for it.
    pressShortcut('Meta+R')
    const macApp = linesOf(row)
    // Several fixed rows share Enter, such as Send and Run the item.
    pressShortcut('Enter')
    const shared = linesOf(row)
    // One fixed row holds Space, which presses a focused button.
    pressShortcut('Space')
    const space = linesOf(row)
    // Enter is fixed with every modifier, also where no fixed row lists it.
    pressShortcut('Shift+Meta+Enter')
    const unlisted = linesOf(row)
    expect({
      named,
      macApp,
      shared,
      space,
      unlisted,
      waiting: accessibleName(document.activeElement ?? document.body),
      saves: await savesOf(server),
    }).toEqual({
      named: ['Undo always uses Command Z.'],
      macApp: ['Reload always uses Command R.'],
      shared: ['Enter is a fixed shortcut.'],
      space: ['Press a focused button always uses Space.'],
      unlisted: ['Shift Command Enter is a fixed shortcut.'],
      waiting: 'New shortcut for Command palette',
      saves: [],
    })
  })

  test('a failed save keeps the saved keys and says which key was not saved', async () => {
    const { server } = await openShortcutsTab()
    server.json(
      'PUT',
      ACCOUNT_PATHS.shortcuts,
      { error: { code: 'internal_error', message: 'The save failed.' } },
      500,
    )
    click(byRole('button', 'Change Command K for Command palette'))
    pressShortcut('Shift+Meta+K')
    await settle()
    const row = rowOf('General', 'Command palette')
    pressShortcut('Meta+K', document.body)
    expect({
      row: controlsOf(row),
      lines: linesOf(row),
      palette: palette() !== null,
    }).toEqual({
      row: [
        'Change Command K for Command palette',
        'Add shortcut for Command palette',
      ],
      lines: ["Shift Command K wasn't saved. Try again."],
      palette: true,
    })
  })
})
