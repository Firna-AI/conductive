// @vitest-environment happy-dom

import { act } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { fakeDecoder, png } from '../../../files/page/picture-test-kit'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../../test-support/dom-queries'
import { press, waitFor } from '../../../test-support/mount'
import { draftFile, mountWith, nameButton, restOn } from './preview-test-kit'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A PNG file of 3 × 2 pixels. */
const shot = new File(
  [Uint8Array.from(atob(png), (char) => char.charCodeAt(0))],
  'shot.png',
  { type: 'image/png' },
)

/** The next picture that the page asks the fake decoder to draw. */
async function nextPicture(made: ReturnType<typeof fakeDecoder>, after = 0) {
  return await waitFor(
    () => made.slice(after).find((picture) => picture.src.startsWith('data:')),
    'a picture to decode',
  )
}

describe('the preview of an attached image in the message field', () => {
  test('the dialog draws the picture of the file, and the focus goes to the field as it closes, also when the field did not have it', async () => {
    const made = fakeDecoder()
    const view = await mountWith(draftFile('draft-shot', shot))
    act(() => view.field.blur())
    await press(nameButton(view.field))
    const dialog = byRole('dialog', 'shot.png')
    const picture = await nextPicture(made)
    picture.draw(3, 2)
    const image = await waitFor(
      () => dialog.querySelector('img'),
      'the picture in the dialog',
    )
    const drawn = {
      alt: image.getAttribute('alt'),
      address: image.getAttribute('src') === picture.src,
    }
    await press(byRole('button', 'Close preview', dialog))
    expect({
      drawn,
      open: queryByRole('dialog', 'shot.png'),
      fieldFocused: document.activeElement === view.field,
    }).toEqual({
      drawn: { alt: 'shot.png', address: true },
      open: null,
      fieldFocused: true,
    })
  })

  test('a picture that the browser cannot draw shows that previews show pictures and text files', async () => {
    const made = fakeDecoder()
    const view = await mountWith(draftFile('draft-shot', shot))
    await press(nameButton(view.field))
    const dialog = byRole('dialog', 'shot.png')
    ;(await nextPicture(made)).refuse()
    await waitFor(
      () => queryByText('Previews show pictures and text files', dialog),
      'the state of a picture without a preview',
    )
    expect(dialog.querySelector('img')).toBeNull()
  })

  test('the card shows the picture of the file, and a press on the chip takes the card away', async () => {
    const made = fakeDecoder()
    const view = await mountWith(draftFile('draft-shot', shot))
    const chip = nameButton(view.field)
    await restOn(chip, 'mouse', 400)
    ;(await nextPicture(made)).draw(3, 2)
    const card = () => document.querySelector('[popover] img')
    const shown = (await waitFor(card, 'the card')).getAttribute('alt')
    act(() => {
      chip.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerType: 'mouse',
        }),
      )
    })
    expect({ shown, after: card() }).toEqual({ shown: 'shot.png', after: null })
  })
})
