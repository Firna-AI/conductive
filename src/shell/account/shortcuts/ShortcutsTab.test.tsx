// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import {
  accessibleName,
  byRole,
  byText,
  queryByRole,
  queryByText,
} from '../../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT } from '../../../test-support/mount'
import { click, settle, typeText } from '../../test-mount'
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

/** The lines above the groups, as a screen reader reads them. */
function introLines(): string[] {
  const intro = byText('Select a shortcut to change it.').parentElement
  return Array.from(intro?.querySelectorAll('p') ?? [], accessibleName)
}

/** The places in the org rail that Switch to org 1 to 9 open. */
const orgPlaces = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** The groups of the tab that show, each with the labels of its rows. */
function shownGroups(): [string, (string | null)[]][] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('main ul[aria-label]'),
    (list) => [
      accessibleName(list),
      Array.from(
        list.querySelectorAll(':scope > li'),
        (row) => row.querySelector('span')?.textContent ?? null,
      ),
    ],
  )
}

/** The changes after Replace gave ⌘/ to Keyboard shortcuts, as in the mockups. */
const edited = [
  { command: 'command-palette', keys: ['Shift+Meta+P'] },
  { command: 'keyboard-shortcuts', keys: ['Meta+/'] },
  { command: 'model-picker', keys: [] },
] as const

describe('the Keyboard shortcuts tab', () => {
  test('Reset gives a command its default keys, and asks first when another command holds one of them', async () => {
    const { server } = await openShortcutsTab(edited)
    replyWith(server, edited.slice(1))
    click(byRole('button', 'Reset Command palette'))
    await settle()
    const palette = controlsOf(rowOf('General', 'Command palette'))
    // ⌘/, the default of Model picker, belongs to Keyboard shortcuts now.
    click(byRole('button', 'Reset Model picker'))
    const model = rowOf('Chat', 'Model picker')
    expect({ lines: linesOf(model), controls: controlsOf(model) }).toEqual({
      lines: ['Keyboard shortcuts uses Command /.'],
      controls: [
        'Replace: move Command / from Keyboard shortcuts to Model picker',
        'Cancel',
      ],
    })
    replyWith(server, [{ command: 'keyboard-shortcuts', keys: [] }])
    click(
      byRole(
        'button',
        'Replace: move Command / from Keyboard shortcuts to Model picker',
      ),
    )
    await settle()
    expect({
      palette,
      saves: await savesOf(server),
      model: controlsOf(rowOf('Chat', 'Model picker')),
      shortcuts: controlsOf(rowOf('General', 'Keyboard shortcuts')),
    }).toEqual({
      palette: [
        'Change Command K for Command palette',
        'Add shortcut for Command palette',
      ],
      saves: [
        {
          keyboard: 'mac',
          changes: [{ command: 'command-palette', keys: null }],
        },
        {
          keyboard: 'mac',
          changes: [
            { command: 'model-picker', keys: null },
            { command: 'keyboard-shortcuts', keys: [] },
          ],
        },
      ],
      model: [
        'Change Command / for Model picker',
        'Add shortcut for Model picker',
      ],
      shortcuts: [
        'Reset Keyboard shortcuts',
        'Add shortcut for Keyboard shortcuts',
      ],
    })
  })

  test('Reset all asks first, then gives each changed command its default keys in one save', async () => {
    const { server } = await openShortcutsTab(edited)
    click(byRole('button', 'Reset all shortcuts'))
    const question = byRole('dialog', 'Reset all shortcuts?')
    const text = question.querySelector('p')?.textContent ?? null
    replyWith(server, [])
    click(byRole('button', 'Reset all', question))
    await settle()
    expect({
      text,
      saves: await savesOf(server),
      question: queryByRole('dialog', 'Reset all shortcuts?') !== null,
      resetAll: queryByRole('button', 'Reset all shortcuts') !== null,
      focused: accessibleName(document.activeElement ?? document.body),
    }).toEqual({
      text: '3 commands get their default shortcuts again, wherever you use Conductive on a Mac.',
      saves: [
        {
          keyboard: 'mac',
          changes: [
            { command: 'command-palette', keys: null },
            { command: 'keyboard-shortcuts', keys: null },
            { command: 'model-picker', keys: null },
          ],
        },
      ],
      question: false,
      resetAll: false,
      focused: 'Search shortcuts',
    })
  })

  test.each([
    {
      host: 'a Mac',
      place: { keyboard: 'mac', system: 'mac' },
      query: 'tab',
      found: [
        [
          'Navigation',
          [
            'Previous tab',
            'Next tab',
            'Close tab',
            'Reopen closed session',
            'Open the menu of a focused tab',
          ],
        ],
        ['Chat', ['New session']],
        ['Menus and palette', ['Switch the palette tab']],
      ],
      rows: ['Close tab'],
      controls: [
        [
          'Change Command W for Close tab, a key that Chrome keeps in this tab',
          'Change Option Command W for Close tab',
          'Add shortcut for Close tab',
        ],
      ],
      lines: [
        'Select a shortcut to change it.',
        'Keys without Command go to the terminal while it has the focus.',
        'Dimmed keys work in the Mac app or in Conductive installed from Chrome.',
      ],
    },
    {
      // Chrome selects a tab on Alt+1 to Alt+9 on Linux, so the app leaves
      // these keys of the orgs to it.
      host: 'Linux',
      place: { keyboard: 'other', system: 'linux' },
      query: 'switch org',
      found: [
        ['Navigation', orgPlaces.map((digit) => `Switch to org ${digit}`)],
      ],
      rows: orgPlaces.map((digit) => `Switch to org ${digit}`),
      controls: orgPlaces.map((digit) => [
        `Change Alt ${digit} for Switch to org ${digit}, a key that Chrome keeps in this tab`,
        `Add shortcut for Switch to org ${digit}`,
      ]),
      lines: [
        'Select a shortcut to change it.',
        'Every key goes to the terminal while it has the focus.',
        'Dimmed keys work in Conductive installed from Chrome.',
      ],
    },
  ] satisfies {
    host: string
    place: TabPlace
    query: string
    found: [string, string[]][]
    rows: string[]
    controls: string[][]
    lines: string[]
  }[])(
    'in a Chrome tab on $host, the search shows only the rows that match, in their groups, with the keys that do not work in the tab dimmed and a line that says where they work, and says when nothing matches',
    async ({ place, query, found, rows, controls, lines }) => {
      await openShortcutsTab([], place)
      const field = byRole('textbox', 'Search shortcuts')
      typeText(field, query)
      const shown = shownGroups()
      const rowControls = rows.map((label) =>
        controlsOf(rowOf('Navigation', label)),
      )
      typeText(field, 'no-such-command')
      const empty = queryByText(
        'Nothing matches “no-such-command”',
      )?.parentElement
      expect({
        lines: introLines(),
        found: shown,
        controls: rowControls,
        none: shownGroups(),
        empty: Array.from(empty?.querySelectorAll('p') ?? [], accessibleName),
      }).toEqual({
        lines,
        found,
        controls,
        none: [],
        empty: [
          'Nothing matches “no-such-command”',
          'Try a command name, such as Close tab.',
        ],
      })
    },
  )
})
