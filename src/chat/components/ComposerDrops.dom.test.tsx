// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { flushMicrotasks } from '../../app/test-kit'
import { byRole } from '../../test-support/dom-queries'
import {
  draggedFiles,
  draggedText,
  dropOn,
  fireDrag,
} from '../../test-support/file-drop'
import { pressInField, typeMessage } from '../../test-support/message-field'
import { MOUNTED_TEST_TIMEOUT, press } from '../../test-support/mount'
import { layOutPoint, textNode } from './chip-field/attached-field-events'
import { mountComposer, names, picked } from './composer-files-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The left edge of the drop caret of the field, or null while it hides. */
const dropCaret = () =>
  document.querySelector<HTMLElement>('[data-drop-caret]')?.style.left ?? null

/** The words of each notice over the box, as a person reads them. */
const notices = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('[role="alert"]'), (notice) =>
    (notice.textContent ?? '').trim(),
  )

describe('a drop of files on the chat composer', () => {
  test('while files hover over the box, it shows the drop state, and the field shows the drop caret under the pointer over the text; a drag that leaves the box hides both, and a drag of text shows neither', async () => {
    const view = await mountComposer()
    await act(async () =>
      view.controller.setDraft(view.sessionId, 'Compare before after'),
    )
    const words = draggedText('before')
    fireDrag(view.field, 'dragenter', words)
    const wordsOver = fireDrag(view.field, 'dragover', words)
    fireDrag(view.field, 'dragleave', words, { to: document.body })
    const text = {
      dropping: view.dropping(),
      taken: wordsOver.defaultPrevented,
    }
    const files = draggedFiles([picked('login.png')])
    const bar = byRole('button', 'Send', view.root).parentElement ?? view.box
    fireDrag(bar, 'dragenter', files)
    const barOver = fireDrag(bar, 'dragover', files)
    const overBar = {
      dropping: view.dropping(),
      taken: barOver.defaultPrevented,
      offer: files.dropEffect,
      caret: dropCaret(),
    }
    const point = layOutPoint({
      over: view.field,
      node: textNode(view.field, 'Compare before after'),
      offset: 'Compare '.length,
      box: new DOMRect(64, 0, 0, 18),
    })
    fireDrag(view.field, 'dragenter', files, { point })
    fireDrag(bar, 'dragleave', files, { to: view.field })
    const moved = view.dropping()
    fireDrag(view.field, 'dragover', files, { point })
    const overText = { moved, dropping: view.dropping(), caret: dropCaret() }
    fireDrag(view.field, 'dragleave', files, { to: document.body })
    expect({
      text,
      overBar,
      overText,
      left: { dropping: view.dropping(), caret: dropCaret() },
      draft: view.draft().text,
    }).toEqual({
      text: { dropping: false, taken: false },
      overBar: { dropping: true, taken: true, offer: 'copy', caret: null },
      overText: { moved: true, dropping: true, caret: '64px' },
      left: { dropping: false, caret: null },
      draft: 'Compare before after',
    })
  })

  test('a drop on the text puts the chips of its files at the place under the pointer: in order, each with a space, as one step of undo, with the focus, and without the path that the drag gives as text too', async () => {
    const view = await mountComposer()
    await act(async () =>
      view.controller.setDraft(view.sessionId, 'Compare before after'),
    )
    const point = layOutPoint({
      over: view.field,
      node: textNode(view.field, 'Compare before after'),
      offset: 'Compare '.length,
    })
    const files = draggedFiles(
      [picked('login.png'), picked('notes.md')],
      '/Users/cal/Desktop/login.png',
    )
    const drop = dropOn(view.field, files, point)
    const dropped = {
      taken: drop.defaultPrevented,
      draft: view.draft().text,
      chips: view.chips(),
      files: names(view.draft().files),
      focused: document.activeElement === view.field,
      dropping: view.dropping(),
      caret: dropCaret(),
    }
    pressInField(view.field, 'z', { ctrlKey: true })
    expect({ dropped, undone: view.draft().text }).toEqual({
      dropped: {
        taken: true,
        draft: `Compare ${view.markOf('login.png')} ${view.markOf('notes.md')} before after`,
        chips: [
          'Attached file login.pngUploading',
          'Attached file notes.mdUploading',
        ],
        files: ['login.png', 'notes.md'],
        focused: true,
        dropping: false,
        caret: null,
      },
      undone: 'Compare before after',
    })
  })

  test('a dropped folder gets no chip and no upload, and the notice over the box names it, also for a folder alone; the files of the drop attach, also an empty one; Attach files in the notice opens the file picker', async () => {
    const view = await mountComposer()
    const opened = vi.fn()
    view.root
      .querySelector('input[type="file"]')
      ?.addEventListener('click', opened)
    const folder = dropOn(
      view.field,
      draggedFiles([{ folder: 'checkout-screens' }]),
    )
    const alone = {
      taken: folder.defaultPrevented,
      notices: notices(view.root),
      chips: view.chips(),
      files: names(view.draft().files),
      uploads: view.jobs.length,
    }
    dropOn(
      view.box,
      draggedFiles([
        picked('login.png'),
        { folder: 'design' },
        new File([], 'empty.txt'),
      ]),
    )
    const mixed = {
      notices: notices(view.root),
      chips: view.chips(),
      files: names(view.draft().files),
      uploads: view.jobs.map(({ name }) => name),
      draft: view.draft().text,
    }
    const notice = view.root.querySelector<HTMLElement>('[role="alert"]')
    if (notice) await press(byRole('button', 'Attach files', notice))
    expect({ alone, mixed, opened: opened.mock.calls.length }).toEqual({
      alone: {
        taken: true,
        notices: [
          "checkout-screens wasn't attachedAttach the files in the folder instead.Attach files",
        ],
        chips: [],
        files: [],
        uploads: 0,
      },
      mixed: {
        notices: [
          "design wasn't attachedAttach the files in the folder instead.Attach files",
        ],
        chips: [
          'Attached file login.pngUploading',
          'Attached file empty.txtUploading',
        ],
        files: ['login.png', 'empty.txt'],
        uploads: ['login.png'],
        draft: `${view.markOf('login.png')} ${view.markOf('empty.txt')} `,
      },
      opened: 1,
    })
  })

  test('the box takes a drop while a send runs, and while a file of the draft uploads, which keeps Send off; a drop on the bar puts the chips at the caret', async () => {
    // The only POST through the fetch of this chat is the send, because the
    // uploads go through the transport of the test.
    const view = await mountComposer('desktop', (request) => {
      return request.method === 'POST'
    })
    typeMessage(view.field, 'Ship it')
    const send = () => byRole('button', 'Send', view.root)
    await press(send())
    const bar = send().parentElement ?? view.box
    const during = dropOn(bar, draggedFiles([picked('late.png')]))
    const sending = {
      sending: view.draft().sending,
      taken: during.defaultPrevented,
      files: names(view.draft().files),
    }
    await act(async () => {
      for (const go of view.held.splice(0)) go()
      await flushMicrotasks()
    })
    // A Firna button marks itself off with `aria-disabled`.
    const uploads = {
      sending: view.draft().sending,
      sendOff: send().getAttribute('aria-disabled'),
    }
    dropOn(bar, draggedFiles([picked('more.png')]))
    expect({
      sending,
      uploads,
      dropped: {
        draft: view.draft().text,
        chips: view.chips(),
        files: names(view.draft().files),
      },
    }).toEqual({
      sending: { sending: true, taken: true, files: ['late.png'] },
      uploads: { sending: false, sendOff: 'true' },
      dropped: {
        draft: `Ship it ${view.markOf('late.png')} ${view.markOf('more.png')} `,
        chips: [
          'Attached file late.pngUploading',
          'Attached file more.pngUploading',
        ],
        files: ['late.png', 'more.png'],
      },
    })
  })
})
