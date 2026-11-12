// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { fileMark } from '../../../app/draft-marks'
import { byRole } from '../../../test-support/dom-queries'
import {
  pasteMessage,
  pressInField,
  typeMessage,
} from '../../../test-support/message-field'
import { holdAnimationFrames, press } from '../../../test-support/mount'
import { layOutPoint, selectText, textNode } from './attached-field-events'
import {
  failedFile,
  mountAttachedField,
  readyFile,
  uploadingFile,
} from './attached-field-test-kit'

// The words of each chip, as `accessibleName` reads them: it joins the text
// of the name and of the label with no space. Chrome reads them with one.
const shotChip = 'Attached file shot.png2 KB'

describe('attached files in the message field', () => {
  test('a pick attaches files and puts their chips at the caret in the same event: in order, each with a space, as one step of undo, and the field takes the focus', async () => {
    const view = await mountAttachedField()
    typeMessage(view.field, 'See:')
    act(() => view.field.blur())
    const shot = await readyFile('draft-shot', 'shot.png')
    const notes = uploadingFile('draft-notes', 'notes.md', null)
    act(() => {
      view.store.set([shot, notes])
      view.handle().insertFiles(['draft-shot', 'draft-gone', 'draft-notes'])
    })
    const inserted = {
      draft: view.draft(),
      chips: view.chips(),
      focused: document.activeElement === view.field,
    }
    pasteMessage(view.field, 'now')
    const typed = view.draft()
    pressInField(view.field, 'z', { ctrlKey: true })
    pressInField(view.field, 'z', { ctrlKey: true })
    const files = `${fileMark('draft-shot')} ${fileMark('draft-notes')}`
    expect({ inserted, typed, undone: view.draft() }).toEqual({
      inserted: {
        draft: `See: ${files} `,
        chips: [shotChip, 'Attached file notes.mdUploading'],
        focused: true,
      },
      typed: `See: ${files} now`,
      undone: 'See:',
    })
  })

  test('a point over the text puts the chips at the place under it, and a point elsewhere puts them at the caret, which keeps the text that it selects', async () => {
    const shot = await readyFile('draft-shot', 'shot.png')
    const view = await mountAttachedField({ files: [shot] })
    typeMessage(view.field, 'Before after')
    const over = layOutPoint({
      over: view.field,
      node: textNode(view.field, 'Before after'),
      offset: 'Before '.length,
    })
    act(() => view.handle().insertFiles(['draft-shot'], over))
    const atPoint = view.draft()
    pressInField(view.field, 'z', { ctrlKey: true })
    selectText(view.field, 'Before after', 0, 'Bef'.length)
    act(() => view.field.blur())
    const outside = layOutPoint({
      over: document.body,
      node: document.body,
      offset: 0,
    })
    act(() => view.handle().insertFiles(['draft-shot'], outside))
    expect({ atPoint, atCaret: view.draft() }).toEqual({
      atPoint: `Before ${fileMark('draft-shot')} after`,
      atCaret: `Bef ${fileMark('draft-shot')} ore after`,
    })
  })

  test('while files hover over the text, the drop caret shows at the place under the pointer and the caret stays; it goes at a drop, and a field that takes no change shows none', async () => {
    const view = await mountAttachedField({
      files: [await readyFile('draft-shot', 'shot.png')],
    })
    typeMessage(view.field, 'Keep the caret')
    const at = (text: string) =>
      layOutPoint({
        over: view.field,
        node: textNode(view.field, text),
        offset: 'Keep'.length,
        box: new DOMRect(30, 0, 0, 18),
      })
    const dropCaret = () =>
      document.querySelector<HTMLElement>('[data-drop-caret]')?.style.left ??
      null
    act(() => view.handle().showDropCaret(at('Keep')))
    const shown = dropCaret()
    act(() => view.handle().clearDropCaret())
    const cleared = dropCaret()
    await view.set((owner) => owner.setEditable(false))
    act(() => view.handle().showDropCaret(at('Keep')))
    const readOnly = dropCaret()
    await view.set((owner) => owner.setEditable(true))
    pasteMessage(view.field, '!')
    const kept = view.draft()
    const point = at('Keep')
    act(() => view.handle().showDropCaret(point))
    act(() => view.handle().insertFiles(['draft-shot'], point))
    expect({
      shown,
      cleared,
      readOnly,
      kept,
      dropped: { caret: dropCaret(), draft: view.draft() },
    }).toEqual({
      shown: '30px',
      cleared: null,
      readOnly: null,
      kept: 'Keep the caret!',
      dropped: {
        caret: null,
        draft: `Keep ${fileMark('draft-shot')} the caret!`,
      },
    })
  })

  test('each upload state draws its chip, which redraws at each change of its file', async () => {
    holdAnimationFrames()
    const view = await mountAttachedField({
      files: [uploadingFile('draft-shot', 'shot.png', null)],
      value: `See ${fileMark('draft-shot')} `,
    })
    const names = [view.chips()]
    const states = [
      uploadingFile('draft-shot', 'shot.png', 512),
      await readyFile('draft-shot', 'shot.png'),
      failedFile('draft-shot', 'shot.png'),
    ]
    for (const item of states) {
      await act(async () => view.store.set([item]))
      names.push(view.chips())
    }
    expect(names).toEqual([
      ['Attached file shot.pngUploading'],
      ['Attached file shot.png25%'],
      [shotChip],
      ['Attached file shot.pngFailedTry again'],
    ])
  })

  test('Try again takes the keyboard focus, sends nothing on Enter, uploads the failed file again, and gives the focus back to the field', async () => {
    const view = await mountAttachedField({
      files: [failedFile('draft-shot', 'shot.png')],
      value: `Fix ${fileMark('draft-shot')} `,
    })
    const again = byRole('button', 'Upload shot.png again', view.field)
    act(() => again.focus())
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      again.dispatchEvent(enter)
    })
    const onEnter = {
      sends: view.sends(),
      draft: view.draft(),
      prevented: enter.defaultPrevented,
    }
    await press(again)
    expect({
      tabIndex: again.tabIndex,
      onEnter,
      retried: view.store.retried,
      focused: document.activeElement === view.field,
    }).toEqual({
      tabIndex: 0,
      onEnter: {
        sends: 0,
        draft: `Fix ${fileMark('draft-shot')} `,
        prevented: false,
      },
      retried: ['draft-shot'],
      focused: true,
    })
  })

  test('a field that takes no change keeps each chip: the × and Try again do nothing, a pick puts no chip, and the upload still redraws', async () => {
    holdAnimationFrames()
    const view = await mountAttachedField({
      files: [
        failedFile('draft-shot', 'shot.png'),
        uploadingFile('draft-notes', 'notes.md', null),
      ],
      value: `${fileMark('draft-shot')} `,
    })
    await view.set((owner) => owner.setEditable(false))
    await press(byRole('button', 'Upload shot.png again', view.field))
    await press(byRole('button', 'Remove shot.png', view.field))
    act(() => view.handle().insertFiles(['draft-notes']))
    await act(async () =>
      view.store.set([uploadingFile('draft-shot', 'shot.png', 1024)]),
    )
    expect({
      draft: view.draft(),
      retried: view.store.retried,
      chips: view.chips(),
    }).toEqual({
      draft: `${fileMark('draft-shot')} `,
      retried: [],
      chips: ['Attached file shot.png50%'],
    })
  })

  test('a draft that comes back shows the chip of each mark of a file that the draft holds, and drops each other mark; a file that then leaves the draft takes its chip out of the text, also from undo, with no step of undo, the caret kept, and no focus taken', async () => {
    const view = await mountAttachedField({
      files: [await readyFile('draft-shot', 'shot.png')],
    })
    const back = `Compare ${fileMark('draft-shot')} with ${fileMark('draft-gone')} now`
    await view.set((owner) => owner.setValue(back))
    const restored = { chips: view.chips(), draft: view.draft() }
    pasteMessage(view.field, '!')
    await act(async () => view.store.set([]))
    const left = {
      chips: view.chips(),
      draft: view.draft(),
      focused: document.activeElement === view.field,
    }
    pasteMessage(view.field, '?')
    const typed = view.draft()
    pressInField(view.field, 'z', { ctrlKey: true })
    pressInField(view.field, 'z', { ctrlKey: true })
    const undoneDraft = view.draft()
    // The field takes the chip out in the task of the undo, as a browser
    // runs it before the next paint.
    await act(async () => {})
    expect({
      restored,
      left,
      typed,
      undone: { chips: view.chips(), draft: undoneDraft },
    }).toEqual({
      restored: {
        chips: [shotChip],
        draft: `Compare ${fileMark('draft-shot')} with  now`,
      },
      left: { chips: [], draft: 'Compare  with  now!', focused: false },
      typed: 'Compare  with  now!?',
      undone: { chips: [], draft: 'Compare  with  now' },
    })
  })

  test('the × of a chip removes it as one step of undo, and undo brings it back', async () => {
    const view = await mountAttachedField({
      files: [await readyFile('draft-shot', 'shot.png')],
      value: `See ${fileMark('draft-shot')} now`,
    })
    await press(byRole('button', 'Remove shot.png', view.field))
    const removed = { draft: view.draft(), chips: view.chips() }
    pressInField(view.field, 'z', { ctrlKey: true })
    expect({
      removed,
      undone: { draft: view.draft(), chips: view.chips() },
    }).toEqual({
      removed: { draft: 'See  now', chips: [] },
      undone: { draft: `See ${fileMark('draft-shot')} now`, chips: [shotChip] },
    })
  })
})
