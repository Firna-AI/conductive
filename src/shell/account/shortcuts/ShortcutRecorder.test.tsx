// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
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
} from './shortcuts-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('the recorder of the Keyboard shortcuts tab', () => {
  test('a recorded key saves to the account, takes the focus, and runs its command', async () => {
    const { server } = await openShortcutsTab()
    click(byRole('button', 'Change Command K for Command palette'))
    replyWith(server, [{ command: 'command-palette', keys: ['Shift+Meta+P'] }])
    // The recorder has the focus, so the press goes to it.
    pressShortcut('Shift+Meta+P')
    await settle()
    const row = rowOf('General', 'Command palette')
    const focused = accessibleName(document.activeElement ?? document.body)
    pressShortcut('Shift+Meta+P', document.body)
    expect({
      saves: await savesOf(server),
      row: controlsOf(row),
      focused,
      palette: palette() !== null,
    }).toEqual({
      saves: [
        {
          keyboard: 'mac',
          changes: [{ command: 'command-palette', keys: ['Shift+Meta+P'] }],
        },
      ],
      row: [
        'Reset Command palette',
        'Change Shift Command P for Command palette',
        'Add shortcut for Command palette',
      ],
      focused: 'Change Shift Command P for Command palette',
      palette: true,
    })
  })

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
    pressShortcut('Shift+Meta+P')
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
      lines: ["Shift Command P wasn't saved. Try again."],
      palette: true,
    })
  })
})
