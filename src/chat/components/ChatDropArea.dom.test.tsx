// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { draggedFiles, dropOn, fireDrag } from '../../test-support/file-drop'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { mountComposer, names, picked } from './composer-files-test-kit'
import { rightClick } from './tab-row-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The transcript of the chat, which shows the messages of the session. */
function transcriptOf(root: HTMLElement): HTMLElement {
  const chat = root.querySelector<HTMLElement>('section[aria-label="Chat"]')
  if (!chat) throw new Error('The chat shows no transcript.')
  return chat
}

/** The row of the session tabs. */
function tabRowOf(root: HTMLElement): HTMLElement {
  const row = root.querySelector<HTMLElement>(
    '[aria-label="Sessions and files"]',
  )
  if (!row) throw new Error('The chat shows no tab row.')
  return row
}

describe('a drop of files anywhere on the chat', () => {
  test('files over the transcript show the drop state of the message box, and a drag that leaves the chat hides it', async () => {
    const view = await mountComposer()
    const files = draggedFiles([picked('login.png')])
    const transcript = transcriptOf(view.root)
    fireDrag(transcript, 'dragenter', files)
    const over = fireDrag(transcript, 'dragover', files)
    const hovered = {
      dropping: view.dropping(),
      taken: over.defaultPrevented,
      offer: files.dropEffect,
    }
    fireDrag(transcript, 'dragleave', files, { to: document.body })
    expect({ hovered, left: view.dropping() }).toEqual({
      hovered: { dropping: true, taken: true, offer: 'copy' },
      left: false,
    })
  })

  test('a drop on the transcript or on the tab row attaches the files to the message box, with their chips at the end of the text, each once', async () => {
    const view = await mountComposer()
    await act(async () => view.controller.setDraft(view.sessionId, 'See'))
    const onTranscript = dropOn(
      transcriptOf(view.root),
      draggedFiles([picked('login.png')]),
    )
    dropOn(tabRowOf(view.root), draggedFiles([picked('notes.md')]))
    expect({
      taken: onTranscript.defaultPrevented,
      draft: view.draft().text,
      chips: view.chips(),
      files: names(view.draft().files),
      dropping: view.dropping(),
    }).toEqual({
      taken: true,
      draft: `See ${view.markOf('login.png')} ${view.markOf('notes.md')} `,
      chips: [
        'Attached file login.pngUploading',
        'Attached file notes.mdUploading',
      ],
      files: ['login.png', 'notes.md'],
      dropping: false,
    })
  })

  test('a drop on an overlay that the chat draws in a portal, such as the menu of a tab, attaches nothing', async () => {
    const view = await mountComposer()
    const tab = tabRowOf(view.root).querySelector<HTMLElement>('button')
    if (!tab) throw new Error('The tab row shows no tab.')
    act(() => {
      rightClick(tab)
    })
    const menu = document.querySelector<HTMLElement>('[role="menu"]')
    if (!menu) throw new Error('The tab menu did not open.')
    const drop = dropOn(menu, draggedFiles([picked('login.png')]))
    expect({
      inChat: view.root.contains(menu),
      taken: drop.defaultPrevented,
      dropping: view.dropping(),
      files: names(view.draft().files),
    }).toEqual({ inChat: false, taken: false, dropping: false, files: [] })
  })
})
