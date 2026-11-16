// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { flushMicrotasks } from '../../app/test-kit'
import { attachmentPath } from '../../shared/attachment-paths'
import { accessibleName, queryAllByRole } from '../../test-support/dom-queries'
import { pickFiles } from '../../test-support/file-picker'
import { pressInField, typeMessage } from '../../test-support/message-field'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { selectText } from './chip-field/attached-field-events'
import {
  failedUpload,
  mountComposer,
  names,
  picked,
  pressFirst,
} from './composer-files-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('the files of the chat composer', () => {
  test('a pick puts its chips at the end of a text without a caret, and at the caret that the field kept while the attach button had the focus: in order, each with a space, and the field takes the focus', async () => {
    const view = await mountComposer()
    await act(async () =>
      view.controller.setDraft(view.sessionId, 'Compare before after'),
    )
    await pickFiles(view.root, [picked('first.txt')])
    const atEnd = {
      draft: view.draft().text,
      focused: document.activeElement === view.field,
    }
    const caret = 'Compare '.length
    selectText(view.field, 'Compare before after', caret, caret)
    await pickFiles(view.root, [picked('a.txt'), picked('b.txt')])
    expect({
      atEnd,
      atCaret: {
        draft: view.draft().text,
        chips: view.chips(),
        files: names(view.draft().files),
        focused: document.activeElement === view.field,
      },
    }).toEqual({
      atEnd: {
        draft: `Compare before after ${view.markOf('first.txt')} `,
        focused: true,
      },
      atCaret: {
        draft: `Compare ${view.markOf('a.txt')} ${view.markOf('b.txt')} before after ${view.markOf('first.txt')} `,
        chips: [
          'Attached file a.txtUploading',
          'Attached file b.txtUploading',
          'Attached file first.txtUploading',
        ],
        files: ['a.txt', 'b.txt', 'first.txt'],
        focused: true,
      },
    })
  })

  test('each chip shows the upload of its file: the measured percent, Uploading before a measurement, the size when it is ready, and Try again only on a failed upload', async () => {
    const view = await mountComposer()
    // Each pick has its own queue, so the upload of each starts at once.
    await pickFiles(view.root, [picked('sketch.png', 'png')])
    await pickFiles(view.root, [picked('notes.txt', 'notes')])
    await pickFiles(view.root, [picked('overlap.png', 'png')])
    await pickFiles(view.root, [picked('console.log', 'log')])
    await view.started(4)
    const screenshot = { id: 'attachment-1', name: 'overlap.png' }
    const path = await attachmentPath(screenshot)
    await act(async () => {
      view.jobs[0]?.progress(2)
      await view.finish(2, screenshot.id, path, {
        kind: 'image',
        mediaType: 'image/png',
        sizeBytes: 290_816,
      })
      view.jobs[3]?.resolve(failedUpload)
      await flushMicrotasks()
    })
    expect({
      chips: view.chips(),
      buttons: Array.from(view.field.querySelectorAll('button'), (button) =>
        accessibleName(button),
      ),
      progress: Array.from(
        view.field.querySelectorAll('[role="progressbar"]'),
        (bar) => ({
          value: bar.getAttribute('aria-valuenow'),
          busy: bar.getAttribute('aria-busy'),
        }),
      ),
    }).toEqual({
      chips: [
        'Attached file sketch.png66%',
        'Attached file notes.txtUploading',
        'Attached file overlap.png284 KB',
        'Attached file console.logFailedTry again',
      ],
      buttons: [
        'Remove sketch.png',
        'Remove notes.txt',
        'Remove overlap.png',
        'Remove console.log',
        'Upload console.log again',
      ],
      progress: [
        { value: '67', busy: null },
        { value: null, busy: 'true' },
      ],
    })
  })

  test('on a computer the cell of the icon is the one button that removes a chip, and Backspace after a chip removes it whole: each takes its file off the draft and stops its upload', async () => {
    const view = await mountComposer()
    typeMessage(view.field, 'See now')
    const caret = 'See'.length
    selectText(view.field, 'See', caret, caret)
    await pickFiles(view.root, [picked('notes.md')])
    await view.started(1)
    const cells = queryAllByRole('button', 'Remove notes.md', view.field)
    const shown = view.draft().text
    await pressFirst(cells)
    const pressed = {
      draft: view.draft().text,
      chips: view.chips(),
      files: names(view.draft().files),
      stopped: view.jobs[0]?.signal.aborted,
    }
    selectText(view.field, 'See', caret, caret)
    await pickFiles(view.root, [picked('todo.md')])
    await view.started(2)
    const keyedFrom = view.draft().text
    pressInField(view.field, 'Backspace')
    expect({
      cells: cells.length,
      first: cells.at(0) === cells.at(0)?.parentElement?.firstElementChild,
      shown,
      pressed,
      keyed: {
        from: keyedFrom,
        draft: view.draft().text,
        chips: view.chips(),
        files: names(view.draft().files),
        detached: names(view.draft().detached).sort(),
        stopped: view.jobs[1]?.signal.aborted,
      },
    }).toEqual({
      cells: 1,
      first: true,
      shown: `See ${view.markOf('notes.md')} now`,
      pressed: { draft: 'See now', chips: [], files: [], stopped: true },
      keyed: {
        from: `See ${view.markOf('todo.md')} now`,
        draft: 'See now',
        chips: [],
        files: [],
        detached: ['notes.md', 'todo.md'],
        stopped: true,
      },
    })
  })

  test('a failed chip keeps Try again, which uploads its file again, and the cell of its icon removes it and stops that upload', async () => {
    const view = await mountComposer()
    await pickFiles(view.root, [picked('notes.md')])
    await view.started(1)
    await act(async () => {
      view.jobs[0]?.resolve(failedUpload)
      await flushMicrotasks()
    })
    const failed = {
      chips: view.chips(),
      cells: queryAllByRole('button', 'Remove notes.md', view.field).length,
    }
    await pressFirst(
      queryAllByRole('button', 'Upload notes.md again', view.field),
    )
    const retried = view.chips()
    await view.started(2)
    await pressFirst(queryAllByRole('button', 'Remove notes.md', view.field))
    expect({
      failed,
      retried,
      uploads: view.jobs.map(({ name }) => name),
      removed: {
        chips: view.chips(),
        files: names(view.draft().files),
        detached: names(view.draft().detached),
        stopped: view.jobs[1]?.signal.aborted,
      },
    }).toEqual({
      failed: { chips: ['Attached file notes.mdFailedTry again'], cells: 1 },
      retried: ['Attached file notes.mdUploading'],
      uploads: ['notes.md', 'notes.md'],
      removed: {
        chips: [],
        files: [],
        detached: ['notes.md'],
        stopped: true,
      },
    })
  })

  test('on a phone the icon of a chip stays, and the button at its end removes the chip and its file', async () => {
    const view = await mountComposer('mobile')
    await pickFiles(view.root, [picked('notes.md')])
    const ends = queryAllByRole('button', 'Remove notes.md', view.field)
    await pressFirst(ends)
    expect({
      count: ends.length,
      last: ends.at(0) === ends.at(0)?.parentElement?.lastElementChild,
      chips: view.chips(),
      files: names(view.draft().files),
      detached: names(view.draft().detached),
    }).toEqual({
      count: 1,
      last: true,
      chips: [],
      files: [],
      detached: ['notes.md'],
    })
  })
})
