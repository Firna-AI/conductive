// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { requestLines } from '../../../app/test-kit'
import {
  menuItems,
  rightClick,
} from '../../../chat/components/tab-row-test-kit'
import type { FilesTarget } from '../../../files/navigation'
import { byLabel, byRole, shownToasts } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../../test-support/fixtures/tools'
import { MOUNTED_TEST_TIMEOUT, press } from '../../../test-support/mount'
import { openPaletteTab } from '../../palette/palette-test-kit'
import { settle } from '../../test-mount'
import { linkTo } from '../wiring-test-kit'
import { filesHref } from './files-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
/** The file of the fixtures that the branch deletes. */
const deleted = 'src/app/checkout/postcodeLookup.ts'

/** A clipboard that keeps each copied text, or refuses it while `refuse`. */
function clipboard() {
  const copied: string[] = []
  const state = { refuse: false }
  const copy = async (text: string | Promise<string>) => {
    if (state.refuse) throw new Error('The clipboard refused the text.')
    copied.push(await text)
  }
  return { copied, state, copy }
}

/** The titles of the toasts that show. */
const toasts = () => shownToasts().map((toast) => toast.textContent)

/** The link of a row of a list of the right column to `to`. */
function rowLink(view: HTMLElement, list: string, to: FilesTarget) {
  const panel = byLabel('Files and tools', view)
  return linkTo(byLabel(list, panel), filesHref(org, id, to))
}

/** Presses Copy path in the open menu of a row, and lets the copy end. */
async function copyPath() {
  await press(byRole('menuitem', 'Copy path'))
  await settle()
}

describe('Copy path in the row menu of the Files panel', () => {
  test('copies the path of a file row and of a folder row of All files from the root of the repository, says "Path copied", and sends no request', async () => {
    const { copied, copy } = clipboard()
    const all = filesHref(org, id, { kind: 'list', list: 'all' })
    const { server, view, navigation } = await openPaletteTab(all, { copy })
    const from = requestLines(server).length
    const file = rowLink(view, 'All files', {
      kind: 'file',
      path: FAKE_FILE_PATH,
      mode: 'preview',
    })

    rightClick(file, { clientX: 900, clientY: 200 })
    const items = menuItems('AddressForm.tsx')
    await copyPath()
    const fileToasts = toasts()
    rightClick(byRole('button', 'lib', byLabel('All files', view)))
    await copyPath()

    expect({
      items,
      copied,
      fileToasts,
      address: navigation.href(),
      requests: requestLines(server).slice(from),
    }).toEqual({
      items: [
        { name: 'Add to chat', off: false },
        { name: 'Copy path', off: false },
      ],
      copied: [FAKE_FILE_PATH, 'src/lib'],
      fileToasts: ['Path copied'],
      address: all,
      requests: [],
    })
  })

  test('opens on the lists that a stopped cloud computer keeps, copies the path that a deleted file of Changes had, starts no cloud computer, and asks to try again when the clipboard refuses', async () => {
    const server = new FakeApiServer({ workspaceState: 'stopped' })
    const { copied, state, copy } = clipboard()
    const changes = filesHref(org, id, { kind: 'list', list: 'changes' })
    const { view } = await openPaletteTab(changes, { server, copy })
    const from = requestLines(server).length
    const row = rowLink(view, 'Changed files', { kind: 'diff', path: deleted })

    rightClick(row, { clientX: 900, clientY: 300 })
    await copyPath()
    const done = { copied: [...copied], toasts: toasts() }
    state.refuse = true
    rightClick(row, { clientX: 900, clientY: 300 })
    await copyPath()

    expect({
      done,
      refused: toasts().at(-1),
      copied,
      requests: requestLines(server).slice(from),
    }).toEqual({
      done: { copied: [deleted], toasts: ['Path copied'] },
      refused: "The path didn't copy. Try again.",
      copied: [deleted],
      requests: [],
    })
  })
})
