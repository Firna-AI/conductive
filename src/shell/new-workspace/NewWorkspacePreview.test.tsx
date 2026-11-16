// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { pickFiles } from '../../test-support/file-picker'
import { messageText } from '../../test-support/message-field'
import { MOUNTED_TEST_TIMEOUT, waitFor } from '../../test-support/mount'
import { click, press, settle } from '../test-mount'
import {
  dialogIn,
  keyDown,
  messageIn,
  newWorkspaceRow,
  openDialog,
  openTab,
  serverWith,
  sidebarOf,
} from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const notes = new File(['# Notes\nline 2\n'], 'notes.md', {
  type: 'text/markdown',
})

/**
 * The preview dialog, or null. The fake API answers each upload with the
 * same attachment, so the chip and the preview take its name.
 */
const previewIn = (view: HTMLElement) =>
  queryByRole('dialog', 'postcode-overlap.png', view)

/** Presses the name of the chip of the file in the New workspace dialog. */
async function openPreview(view: HTMLElement): Promise<HTMLElement> {
  const name = await waitFor(
    () =>
      messageIn(openDialog(view)).querySelector<HTMLElement>(
        '[contenteditable="false"] button:not([aria-label])',
      ),
    'the name of the chip',
  )
  click(name)
  await settle()
  return await waitFor(() => previewIn(view), 'the preview dialog')
}

/** Presses the dimmed app around the preview, as a pointer does. */
function pressScrim(preview: HTMLElement) {
  const scrim = preview.previousElementSibling
  if (!(scrim instanceof HTMLElement)) throw new Error('No dimmed app.')
  act(() => {
    scrim.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
    )
    scrim.click()
  })
}

describe('the preview of an attached file in the New workspace dialog', () => {
  test('is a layer of its own: Tab stays on Close, and Escape or a press on the dimmed app closes only the preview, and the dialog keeps its draft', async () => {
    const tab = await openTab(serverWith('dialog'))
    click(newWorkspaceRow(sidebarOf(tab.view)))
    await settle()
    await pickFiles(openDialog(tab.view), [notes])
    await settle()
    const draft = messageText(messageIn(openDialog(tab.view)))
    const preview = await openPreview(tab.view)
    const close = byRole('button', 'Close preview', preview)
    // The trap of the dialog leaves the Tab of the preview alone, so no
    // part of the dialog takes the focus, also not for a moment.
    const visits: string[] = []
    const visit = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement) {
        visits.push(event.target.getAttribute('aria-label') ?? '')
      }
    }
    openDialog(tab.view).addEventListener('focusin', visit)
    const tabs = {
      kept: keyDown(close, { key: 'Tab' }),
      keptBack: keyDown(close, { key: 'Tab', shiftKey: true }),
      focus: document.activeElement === close,
      visits,
    }
    openDialog(tab.view).removeEventListener('focusin', visit)
    press(close, 'Escape')
    await settle()
    const escaped = {
      preview: previewIn(tab.view),
      dialog: dialogIn(tab.view) !== null,
    }
    pressScrim(await openPreview(tab.view))
    await settle()
    expect({
      tabs,
      escaped,
      pressed: {
        preview: previewIn(tab.view),
        dialog: dialogIn(tab.view) !== null,
        draft: messageText(messageIn(openDialog(tab.view))),
      },
    }).toEqual({
      tabs: { kept: true, keptBack: true, focus: true, visits: [] },
      escaped: { preview: null, dialog: true },
      pressed: { preview: null, dialog: true, draft },
    })
  })
})
