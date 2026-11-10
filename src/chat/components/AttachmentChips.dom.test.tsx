// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { TouchScreen } from '../../../docs/mockups/src/components/common/touch'
import type { Attachment } from '../../shared/messages'
import { queryAllByRole } from '../../test-support/dom-queries'
import { mount, press } from '../../test-support/mount'
import { DraftFiles } from './AttachmentChips'

const notes: Attachment = {
  id: 'file-notes',
  name: 'notes.md',
  kind: 'file',
  mediaType: 'text/markdown',
  sizeBytes: 2048,
}

async function mountFiles(phone: boolean) {
  const removed: string[] = []
  const files = (
    <DraftFiles attachments={[notes]} onRemove={(id) => removed.push(id)} />
  )
  const { container } = await mount(
    phone ? <TouchScreen>{files}</TouchScreen> : files,
  )
  const buttons = queryAllByRole('button', 'Remove notes.md', container)
  return { container, buttons, removed }
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
    }).toEqual({ count: 1, first: true, tabIndex: 0, removed: ['file-notes'] })
  })

  test('on a phone the icon stays, and the button at the end removes the file', async () => {
    const view = await mountFiles(true)
    const [end] = view.buttons
    await press(end)
    expect({
      count: view.buttons.length,
      last: end === view.container.querySelector('li')?.lastElementChild,
      removed: view.removed,
    }).toEqual({ count: 1, last: true, removed: ['file-notes'] })
  })
})
