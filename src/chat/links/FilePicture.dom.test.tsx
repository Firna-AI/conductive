// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import {
  filesAfterHistory,
  heldTree,
  waitUntil,
} from '../../files/files-test-kit'
import type { WorkspaceFiles } from '../../files/model/files-store'
import { fakeDecoder } from '../../files/page/picture-test-kit'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { press } from '../../test-support/mount'
import { AgentText } from '../components/AgentText'
import { copyAll } from './mention-copy-test-kit'
import {
  fakeNearView,
  fakeReader,
  imagesIn,
  mountPictures,
  shotAddress,
} from './picture-test-kit'

const answer = 'The phone view: ![Phone view](shots/after.png). It fits.'

/** The ID of the item of the answer in the transcript. */
const message = 'agent:turn-1:answer-1'

/** An answer with a screenshot, in a chat that reads pictures. */
async function mountAnswer(text = answer, files?: WorkspaceFiles) {
  const near = fakeNearView()
  const decoded = fakeDecoder()
  const pictures = fakeReader()
  const view = await mountPictures(
    <AgentText id={message} text={text} />,
    pictures.reader,
    files,
  )
  return { ...view, near, decoded, pictures }
}

/** The element of the answer, whose children are its blocks. */
function answerIn(container: HTMLElement): Element {
  const block = container.querySelector('p')?.parentElement
  if (!block) throw new Error('No answer shows')
  return block
}

describe('the picture of a Markdown image in an answer', () => {
  test('shows the picture when its file tree arrives after the answer', async () => {
    const server = new FakeApiServer()
    server.json('GET', filePaths.tree(FAKE_IDS.org, FAKE_IDS.workspace), {
      revision: 1,
      entries: [
        {
          path: 'shots/after.png',
          name: 'after.png',
          kind: 'file',
          change: null,
        },
      ],
    })
    const held = heldTree(server)
    const files = filesAfterHistory(server, held.fetch)
    files.start()
    const view = await mountAnswer(answer, files)
    view.near.come()
    // Until the tree arrives, the path names no entry, so the image shows
    // its alt text, as file-mentions-answers.md says.
    expect(view.container.querySelector('p')?.textContent).toBe(
      'The phone view: Phone view. It fits.',
    )
    expect({
      images: imagesIn(view.container),
      watched: view.near.observers.length,
      asked: view.pictures.asked(),
    }).toEqual({ images: [], watched: 0, asked: [] })

    await act(async () => {
      held.release()
      await waitUntil(() =>
        expect(files.getSnapshot().tree?.entries.has('shots/after.png')).toBe(
          true,
        ),
      )
    })
    expect(imagesIn(view.container)).toEqual([
      { name: 'Phone view', shows: 'box', in: 'P', title: 'shots/after.png' },
    ])
    expect(view.pictures.asked()).toEqual([])
    view.near.come()
    expect(view.pictures.asked()).toEqual([
      { path: 'shots/after.png', message },
    ])
    await view.pictures.answer(0, { status: 'picture', address: shotAddress })
    view.decoded[0]?.draw(390, 844)
    expect(imagesIn(view.container)).toEqual([
      {
        name: 'Phone view',
        shows: 'picture',
        in: 'P',
        title: 'shots/after.png',
      },
    ])
  })

  test('shows the box of its label, and reads the file for its message only when it comes near the view of the chat', async () => {
    const view = await mountAnswer()
    const before = view.pictures.asked()
    const [observer] = view.near.observers
    const box = view.container.querySelector('a')
    if (!box) throw new Error('No box shows')
    await press(box)
    view.near.come()
    expect({
      images: imagesIn(view.container),
      before,
      root: observer?.root === view.scroller,
      margin: Number.parseFloat(observer?.rootMargin ?? '0') > 0,
      opened: view.opened,
      after: view.pictures.asked(),
    }).toEqual({
      images: [
        { name: 'Phone view', shows: 'box', in: 'P', title: 'shots/after.png' },
      ],
      before: [],
      root: true,
      margin: true,
      opened: ['shots/after.png'],
      after: [{ path: 'shots/after.png', message }],
    })
  })

  test('shows the picture at its own size with the label as its alternative text, and a plain press opens the file tab', async () => {
    const view = await mountAnswer()
    view.near.come()
    await view.pictures.answer(0, { status: 'picture', address: shotAddress })
    view.decoded[0]?.draw(390, 844)
    const link = view.container.querySelector('a')
    const image = link?.querySelector('img')
    if (!link || !image) throw new Error('No picture shows')
    await press(link)
    const plain = [...view.opened]
    // A browser opens the address of a click with a modifier key itself.
    const newTab = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      metaKey: true,
    })
    act(() => {
      link.dispatchEvent(newTab)
    })
    expect({
      images: imagesIn(view.container),
      decoded: view.decoded.map((made) => made.src),
      picture: {
        alt: image.alt,
        src: image.getAttribute('src'),
        width: link.style.getPropertyValue('--picture-width'),
        ratio: link.style.getPropertyValue('--picture-ratio'),
        href: link.getAttribute('href'),
      },
      plain,
      modified: { kept: newTab.defaultPrevented, opened: view.opened },
    }).toEqual({
      images: [
        {
          name: 'Phone view',
          shows: 'picture',
          in: 'P',
          title: 'shots/after.png',
        },
      ],
      decoded: [shotAddress],
      picture: {
        alt: 'Phone view',
        src: shotAddress,
        width: '390px',
        ratio: '390 / 844',
        href: '/files/shots/after.png',
      },
      plain: ['shots/after.png'],
      modified: { kept: false, opened: ['shots/after.png'] },
    })
  })

  test('shows the link with the code of its label, and watches and reads nothing, while the chat reads no picture', async () => {
    const near = fakeNearView()
    const view = await mountPictures(
      <AgentText id={message} text="See ![Phone `view`](shots/after.png)." />,
    )
    const link = view.container.querySelector('a')
    if (!link) throw new Error('No link shows')
    await press(link)
    expect({
      images: imagesIn(view.container),
      code: Array.from(
        link.querySelectorAll('code'),
        (code) => code.textContent,
      ),
      watched: near.observers.length,
      opened: view.opened,
    }).toEqual({
      images: [
        {
          name: 'Phone view',
          shows: 'link',
          in: 'P',
          title: 'shots/after.png',
        },
      ],
      code: ['view'],
      watched: 0,
      opened: ['shots/after.png'],
    })
  })

  test('shows the link after a failed read, and for bytes that the browser cannot draw', async () => {
    const view = await mountAnswer(
      'Before ![Before](shots/before.png) and after ![After](shots/after.png).',
    )
    view.near.come()
    await view.pictures.answer(0, { status: 'failed' })
    await view.pictures.answer(1, { status: 'picture', address: shotAddress })
    view.decoded[0]?.refuse()
    expect({
      asked: view.pictures.asked().map(({ path }) => path),
      images: imagesIn(view.container),
    }).toEqual({
      asked: ['shots/before.png', 'shots/after.png'],
      images: [
        { name: 'Before', shows: 'link', in: 'P', title: 'shots/before.png' },
        { name: 'After', shows: 'link', in: 'P', title: 'shots/after.png' },
      ],
    })
  })

  test('aborts its read when it unmounts', async () => {
    const view = await mountAnswer()
    view.near.come()
    const [read] = view.pictures.reads
    const before = read?.signal.aborted
    await view.unmount()
    expect({ before, after: read?.signal.aborted }).toEqual({
      before: false,
      after: true,
    })
  })

  test('a copy of the answer gives the Markdown image as the agent wrote it, while the box and while the picture shows', async () => {
    const view = await mountAnswer()
    const box = copyAll(answerIn(view.container))
    view.near.come()
    await view.pictures.answer(0, { status: 'picture', address: shotAddress })
    view.decoded[0]?.draw(390, 844)
    const picture = copyAll(answerIn(view.container))
    expect({ box, picture }).toEqual({
      box: { copying: true, native: true, text: answer },
      picture: { copying: true, native: true, text: answer },
    })
  })
})
