// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { ACCOUNT_PATHS } from '../../shared/account'
import { sessionPaths } from '../../shared/sessions'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../../test-support/fixtures/core'
import {
  messageText,
  pressInField,
  typeMessage,
} from '../../test-support/message-field'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import {
  openPaletteTab,
  palette,
  searchField,
} from '../palette/palette-test-kit'
import { settle } from '../test-mount'
import { bodiesOf, messageField } from '../workspace/kept-test-kit'
import { socketsOf } from '../workspace/wiring-test-kit'
import {
  keysHeardBy,
  OfferedCommand,
  pressCommand,
  pressShortcut,
} from './shortcut-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace, session } = FAKE_IDS

/** The message field of a workspace in a Chrome tab on Windows, with a draft. */
async function draftField(
  draft: string,
  server = new FakeApiServer(),
): Promise<HTMLElement> {
  holdAnimationFrames()
  const { view } = await openPaletteTab(routes.workspace(org, workspace), {
    server,
    events: socketsOf(server).events,
  })
  const field = messageField(view)
  typeMessage(field, draft)
  return field
}

describe('the shortcut listener', () => {
  test('a key that runs its command goes no further, so the message field never hears it', async () => {
    const field = await draftField('Ship the fix')
    const heard = keysHeardBy(field)
    const key = pressCommand('command-palette', 'other', field)
    expect({
      palette: palette() !== null,
      prevented: key.defaultPrevented,
      heard,
      draft: messageText(field),
    }).toEqual({
      palette: true,
      prevented: true,
      heard: [],
      draft: 'Ship the fix',
    })
  })

  test('a text key in the message field still edits the text and runs no command', async () => {
    const field = await draftField('Ship the fix')
    pressInField(field, 'a', { code: 'KeyA', ctrlKey: true })
    pressInField(field, 'Backspace', { code: 'Backspace' })
    expect({
      draft: messageText(field),
      palette: palette() !== null,
    }).toEqual({ draft: '', palette: false })
  })

  test('a recorded Enter key with Ctrl stays with the message field, which adds a line on Ctrl+Shift+Enter and sends on Ctrl+Enter', async () => {
    // The person gave both keys to the palette on the Windows keyboard.
    const server = new FakeApiServer()
    server.json('GET', ACCOUNT_PATHS.account, {
      ...coreFixtures().account,
      shortcuts: {
        mac: [],
        other: [
          {
            command: 'command-palette',
            keys: ['Ctrl+Enter', 'Ctrl+Shift+Enter'],
          },
        ],
      },
    })
    const field = await draftField('Ship the fix', server)
    pressInField(field, 'Enter', {
      code: 'Enter',
      ctrlKey: true,
      shiftKey: true,
    })
    const line = { draft: messageText(field), palette: palette() !== null }
    pressInField(field, 'Enter', { code: 'Enter', ctrlKey: true })
    await settle()
    expect({
      line,
      palette: palette() !== null,
      sent: await bodiesOf(
        server,
        'POST',
        sessionPaths.messages(org, workspace, session),
        0,
      ),
    }).toEqual({
      line: { draft: 'Ship the fix\n', palette: false },
      palette: false,
      sent: [expect.objectContaining({ text: 'Ship the fix\n' })],
    })
  })

  test('a held key runs its command once, and its repeats go no further', async () => {
    await openPaletteTab(routes.org(org))
    const first = pressCommand('command-palette', 'other', document.body)
    const field = searchField()
    const heard = keysHeardBy(field)
    const repeat = pressShortcut('Ctrl+K', field, { repeat: true })
    expect({
      first: first.defaultPrevented,
      palette: palette() !== null,
      repeat: repeat.defaultPrevented,
      heard,
    }).toEqual({ first: true, palette: true, repeat: true, heard: [] })
  })

  test('on Windows and Linux, only the screen of the terminal keeps its keys, so Ctrl+K runs from Reconnect', async () => {
    holdAnimationFrames()
    // The events of the test open no terminal socket, so the terminal
    // shows Disconnected with Reconnect.
    const { view } = await openPaletteTab(routes.workspace(org, workspace))
    await settle()
    const reconnect = byRole('button', 'Reconnect', view)
    reconnect.focus()
    const key = pressCommand('command-palette', 'other', reconnect)
    expect({
      prevented: key.defaultPrevented,
      palette: palette() !== null,
    }).toEqual({ prevented: true, palette: true })
  })

  test('a browser tab leaves a kept key to the browser, and the second key runs the command', async () => {
    let runs = 0
    await openPaletteTab(routes.org(org), {
      platform: 'mac',
      beside: <OfferedCommand command="close-tab" run={() => (runs += 1)} />,
    })
    // A Chrome tab keeps ⌘W, the first key of Close tab.
    const kept = pressShortcut('Meta+W', document.body)
    const keptRuns = runs
    // On a Mac, ⌥W types ∑, so the press matches by its physical key.
    const second = pressShortcut('Alt+Meta+W', document.body, { key: '∑' })
    expect({
      kept: { prevented: kept.defaultPrevented, runs: keptRuns },
      second: { prevented: second.defaultPrevented, runs },
    }).toEqual({
      kept: { prevented: false, runs: 0 },
      second: { prevented: true, runs: 1 },
    })
  })
})
