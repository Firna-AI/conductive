// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { fileMark } from '../../../app/draft-marks'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../../test-support/dom-queries'
import { press, pressKey, waitFor } from '../../../test-support/mount'
import {
  draftFile,
  hover,
  mountWith,
  nameButton,
  restOn,
} from './preview-test-kit'

const notes = new File(
  ['# Notes\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\n'],
  'notes.md',
  { type: 'text/markdown' },
)

const archive = new File([new Uint8Array([80, 75, 3, 4, 0, 0])], 'site.zip', {
  type: 'application/zip',
})

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
      () => queryByText('Previews show pictures and text files', dialog),
      'the state of a file without a preview',
    )
    await press(byRole('button', 'Close preview', dialog))
    expect(queryByRole('dialog', 'site.zip')).toBeNull()
  })

  test('a mouse that rests 400 ms on the chip shows a card with the first lines of the file, a shorter rest or a touch shows none, and the card goes when the pointer leaves', async () => {
    const view = await mountWith(draftFile('draft-notes', notes))
    const chip = nameButton(view.field)
    const card = () => document.querySelector('pre')
    const short = await restOn(chip, 'mouse', 399)
    hover(chip, 'pointerout')
    const touch = await restOn(chip, 'touch', 1000)
    hover(chip, 'pointerout')
    await restOn(chip, 'mouse', 400)
    const shown = (await waitFor(card, 'the card of the pointer')).textContent
    hover(chip, 'pointerout')
    expect({ short, touch, shown, after: card() }).toEqual({
      short: null,
      touch: null,
      shown: '# Notes\nline 2\nline 3\nline 4\nline 5\nline 6',
      after: null,
    })
  })

  test('a picture over 20 MB shows that previews show smaller files', async () => {
    const large = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    })
    const view = await mountWith(draftFile('draft-big', large))
    await press(nameButton(view.field))
    const dialog = byRole('dialog', 'big.png')
    await waitFor(
      () => queryByText('Previews show smaller files', dialog),
      'the state of a file over the limit',
    )
  })
})
