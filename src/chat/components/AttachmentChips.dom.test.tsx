// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { TouchScreen } from '../../../docs/mockups/src/components/common/touch'
import { ApiError } from '../../app/api/client'
import type { DraftFile } from '../../app/draft-files'
import type { Attachment } from '../../shared/messages'
import { queryAllByRole } from '../../test-support/dom-queries'
import { mount, press } from '../../test-support/mount'
import { DraftFiles } from './AttachmentChips'

const notes: Attachment = {
  id: 'file-notes',
  name: 'notes.md',
  path: null,
  kind: 'file',
  mediaType: 'text/markdown',
  sizeBytes: 2048,
}

const notesFile = new File(['# Notes'], 'notes.md', { type: 'text/markdown' })

const ready: DraftFile = {
  state: 'ready',
  id: 'draft-notes',
  file: notesFile,
  attachment: notes,
}

const failed: DraftFile = {
  state: 'failed',
  id: 'draft-notes',
  file: notesFile,
  error: new ApiError(500, 'upload_failed', 'The upload failed.'),
}

async function mountFiles(phone: boolean, item: DraftFile = ready) {
  const removed: string[] = []
  const retried: string[] = []
  const files = (
    <DraftFiles
      files={[item]}
      onRemove={(id) => removed.push(id)}
      onRetry={(id) => retried.push(id)}
    />
  )
  const { container } = await mount(
    phone ? <TouchScreen>{files}</TouchScreen> : files,
  )
  const buttons = queryAllByRole('button', 'Remove notes.md', container)
  return { container, buttons, removed, retried }
}

describe('the files of a draft', () => {
  test('the cell of the icon is the one button that removes a file, and the keyboard reaches it', async () => {
    const view = await mountFiles(false)
    const [cell] = view.buttons
    await press(cell)
    expect({
      count: view.buttons.length,
      first: cell === view.container.querySelector('li')?.firstElementChild,
      tabIndex: cell.tabIndex,
      removed: view.removed,
    }).toEqual({ count: 1, first: true, tabIndex: 0, removed: ['draft-notes'] })
  })

  test('a failed upload keeps Try again, and the cell of its icon removes it', async () => {
    const view = await mountFiles(false, failed)
    const [again] = queryAllByRole(
      'button',
      'Upload notes.md again',
      view.container,
    )
    await press(again)
    await press(view.buttons[0])
    expect({
      count: view.buttons.length,
      retried: view.retried,
      removed: view.removed,
    }).toEqual({ count: 1, retried: ['draft-notes'], removed: ['draft-notes'] })
  })

  test('on a phone the icon stays, and the button at the end removes the file', async () => {
    const view = await mountFiles(true)
    const [end] = view.buttons
    await press(end)
    expect({
      count: view.buttons.length,
      last: end === view.container.querySelector('li')?.lastElementChild,
      removed: view.removed,
    }).toEqual({ count: 1, last: true, removed: ['draft-notes'] })
  })
})
