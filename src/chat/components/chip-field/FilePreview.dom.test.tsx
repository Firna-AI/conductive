// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import type { DraftFile } from '../../../app/draft-files'
import { fileMark } from '../../../app/draft-marks'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../../test-support/dom-queries'
import {
  holdAnimationFrames,
  press,
  pressKey,
  waitFor,
} from '../../../test-support/mount'
import { mountAttachedField } from './attached-field-test-kit'

/** A file of a draft whose upload runs, with these bytes. */
function draftFile(id: string, file: File): DraftFile {
  return { state: 'uploading', id, file, sentBytes: null, upload: null }
}

const notes = new File(
  ['# Notes\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\n'],
  'notes.md',
  { type: 'text/markdown' },
)

const archive = new File([new Uint8Array([80, 75, 3, 4, 0, 0])], 'site.zip', {
  type: 'application/zip',
})

/** Mounts the field with the chip of the file, whose spinner holds still. */
async function mountWith(file: DraftFile) {
  holdAnimationFrames()
  const view = await mountAttachedField({
    value: `See ${fileMark(file.id)} `,
    files: [file],
  })
  await waitFor(() => view.chips().length === 1, 'the chip of the file')
  return view
}

/** The button of the name of the only chip of the field. */
function nameButton(field: HTMLElement): HTMLElement {
  const button = field.querySelector<HTMLElement>(
    '[contenteditable="false"] button[tabindex="-1"]:not([aria-label])',
  )
  if (!button) throw new Error('The chip has no name button.')
  return button
}

function hover(element: Element, type: 'pointerover' | 'pointerout') {
  act(() => {
    element.dispatchEvent(
      new PointerEvent(type, { bubbles: true, pointerType: 'mouse' }),
    )
  })
}

describe('the preview of an attached file in the message field', () => {
  test('a press on the name opens the text of the file in a dialog, which holds the focus while the field is inert, and Escape closes it and keeps the draft', async () => {
    const view = await mountWith(draftFile('draft-notes', notes))
    await press(nameButton(view.field))
    const dialog = byRole('dialog', 'notes.md')
    await waitFor(() => queryByText('line 7', dialog), 'the text of the file')
    const whileOpen = {
      fieldInert: view.field.inert,
      focus: document.activeElement?.getAttribute('aria-label'),
    }
    await pressKey('Escape')
    expect({
      whileOpen,
      open: queryByRole('dialog', 'notes.md'),
      fieldInert: view.field.inert,
      draft: view.draft(),
    }).toEqual({
      whileOpen: { fieldInert: true, focus: 'Close preview' },
      open: null,
      fieldInert: false,
      draft: `See ${fileMark('draft-notes')} `,
    })
  })

  test('Close closes the dialog, and a file that is not text has no preview', async () => {
    const view = await mountWith(draftFile('draft-zip', archive))
    await press(nameButton(view.field))
    const dialog = byRole('dialog', 'site.zip')
    await waitFor(
      () => queryByText('No preview for this file', dialog),
      'the state of a file without a preview',
    )
    await press(byRole('button', 'Close preview', dialog))
    expect(queryByRole('dialog', 'site.zip')).toBeNull()
  })

  test('a pointer that rests on the chip shows a card with the first lines of the file, and the card goes when the pointer leaves', async () => {
    const view = await mountWith(draftFile('draft-notes', notes))
    const chip = nameButton(view.field)
    hover(chip, 'pointerover')
    const card = () => document.querySelector('pre')
    const shown = (await waitFor(card, 'the card of the pointer')).textContent
    hover(chip, 'pointerout')
    expect({ shown, after: card() }).toEqual({
      shown: '# Notes\nline 2\nline 3\nline 4\nline 5\nline 6',
      after: null,
    })
  })
})
