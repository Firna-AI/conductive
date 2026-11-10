// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  messageText,
  pressInField,
  typeMessage,
} from '../../test-support/message-field'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { openPaletteTab, palette } from '../palette/palette-test-kit'
import { messageField } from '../workspace/kept-test-kit'
import { socketsOf } from '../workspace/wiring-test-kit'
import {
  keysHeardBy,
  OfferedCommand,
  pressCommand,
  pressShortcut,
} from './shortcut-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS

/** The message field of a workspace in a Chrome tab on Windows, with a draft. */
async function draftField(draft: string): Promise<HTMLElement> {
  holdAnimationFrames()
  const server = new FakeApiServer()
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
    const second = pressShortcut('Alt+Meta+W', document.body, '∑')
    expect({
      kept: { prevented: kept.defaultPrevented, runs: keptRuns },
      second: { prevented: second.defaultPrevented, runs },
    }).toEqual({
      kept: { prevented: false, runs: 0 },
      second: { prevented: true, runs: 1 },
    })
  })
})
