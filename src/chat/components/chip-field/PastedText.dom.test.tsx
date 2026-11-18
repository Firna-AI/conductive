// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { fileMark } from '../../../app/draft-marks'
import { holdAnimationFrames } from '../../../test-support/mount'
import { pasteMessage, pressInField } from '../../../test-support/message-field'
import { clip } from './attached-field-events'
import { mountAttachedField } from './attached-field-test-kit'
import { PASTE_FILE_CHARACTERS, PASTE_FILE_LINES } from './pasted-text'

/** A text of one line with exactly `size` characters. */
const longLine = (size: number) => 'x'.repeat(size)

/** A text of `count` short lines. */
const lines = (count: number) =>
  Array.from({ length: count }, (_, index) => `line ${index}`).join('\n')

const pastedChip = 'Attached file Pasted text.txtUploading'

function selectAll(field: HTMLElement) {
  pressInField(field, 'a', { ctrlKey: true })
}

describe('a large paste becomes an attached text file', () => {
  test('a paste at the size limit attaches its exact text as a plain text file, with its chip at the caret and a space after it, as one step of undo', async () => {
    holdAnimationFrames()
    const text = `${longLine(PASTE_FILE_CHARACTERS - 2)}\r\n`
    const view = await mountAttachedField({ attach: 'upload', value: 'See ' })
    pasteMessage(view.field, text)
    const [file] = view.attached
    const pasted = { draft: view.draft(), chips: view.chips() }
    pressInField(view.field, 'z', { ctrlKey: true })
    expect({
      count: view.attached.length,
      name: file?.name,
      type: file?.type,
      text: await file?.text(),
      pasted,
      undone: view.draft(),
    }).toEqual({
      count: 1,
      name: 'Pasted text.txt',
      type: 'text/plain',
      text,
      pasted: {
        draft: `See ${fileMark('draft-attached-1')} `,
        chips: [pastedChip],
      },
      undone: 'See ',
    })
  })

  test('a paste with many short lines becomes a file, and a paste under both limits stays text', async () => {
    const view = await mountAttachedField({ attach: 'upload' })
    pasteMessage(view.field, lines(PASTE_FILE_LINES - 1))
    const short = { draft: view.draft(), attached: view.attached.length }
    selectAll(view.field)
    pasteMessage(view.field, lines(PASTE_FILE_LINES))
    expect({ short, draft: view.draft(), chips: view.chips() }).toEqual({
      short: { draft: lines(PASTE_FILE_LINES - 1), attached: 0 },
      draft: `${fileMark('draft-attached-1')} `,
      chips: [pastedChip],
    })
  })

  test('the chip replaces the selected text, and a second paste in the draft gets the next number', async () => {
    const view = await mountAttachedField({
      attach: 'upload',
      value: 'Old words',
    })
    selectAll(view.field)
    pasteMessage(view.field, longLine(PASTE_FILE_CHARACTERS))
    pasteMessage(view.field, longLine(PASTE_FILE_CHARACTERS))
    expect({
      names: view.attached.map((file) => file.name),
      draft: view.draft(),
    }).toEqual({
      names: ['Pasted text.txt', 'Pasted text 2.txt'],
      draft: `${fileMark('draft-attached-1')} ${fileMark('draft-attached-2')} `,
    })
  })

  test('a refused file leaves the text as it was', async () => {
    const view = await mountAttachedField({
      attach: 'refuse',
      value: 'Keep me',
    })
    selectAll(view.field)
    pasteMessage(view.field, longLine(PASTE_FILE_CHARACTERS))
    expect({ draft: view.draft(), chips: view.chips() }).toEqual({
      draft: 'Keep me',
      chips: [],
    })
  })

  test('a field without an attach, and a paste of the kept copy of the field, keep the large text as text', async () => {
    const large = longLine(PASTE_FILE_CHARACTERS)
    const plain = await mountAttachedField()
    pasteMessage(plain.field, large)
    const moved = await mountAttachedField({ attach: 'upload', value: large })
    selectAll(moved.field)
    const cut = clip(moved.field, 'cut')
    pasteMessage(moved.field, cut)
    expect({
      plain: plain.draft(),
      moved: moved.draft(),
      attached: moved.attached.length,
    }).toEqual({ plain: large, moved: large, attached: 0 })
  })
})
