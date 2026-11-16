// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { openPaletteTab, palette } from '../palette/palette-test-kit'
import { pressCommand } from '../shortcuts/shortcut-test-kit'
import { click, press } from '../test-mount'
import {
  hideSidebar,
  openPopover,
  pointerDown,
  popover,
  rowOf,
  tile,
} from './list-popover-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS

/** Opens a workspace with its sidebar hidden and its list popover open. */
async function openWithPopover() {
  const opened = await openPaletteTab(routes.workspace(org, workspace))
  hideSidebar(opened.view)
  click(tile(opened.view, 'Acme'))
  return { ...opened, list: openPopover() }
}

// Each test fails when one rule that keeps the popover open goes.
describe('the rules that keep the list popover open', () => {
  test('a press in a dialog over the popover, such as the palette, belongs to the dialog', async () => {
    await openWithPopover()
    pressCommand('command-palette', 'other', document.body)
    const dialog = palette()
    if (!dialog) throw new Error('The palette did not open.')
    act(() => pointerDown(dialog))
    expect({ palette: palette() !== null, open: popover() !== null }).toEqual({
      palette: true,
      open: true,
    })
  })

  test('an Escape that a handler of the page took does not close it', async () => {
    const { list } = await openWithPopover()
    const row = rowOf(list, 'apple-pay')
    row.addEventListener('keydown', (event) => event.preventDefault())
    press(row, 'Escape')
    expect(popover() !== null).toBe(true)
  })

  test('an Escape that an input method composes in a field outside the popover stays with the text', async () => {
    const { view } = await openWithPopover()
    const field = view.querySelector<HTMLElement>('[contenteditable="true"]')
    if (!field || popover()?.contains(field)) {
      throw new Error('The page has no message field outside the popover.')
    }
    act(() => {
      field.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          isComposing: true,
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    expect(popover() !== null).toBe(true)
  })
})
