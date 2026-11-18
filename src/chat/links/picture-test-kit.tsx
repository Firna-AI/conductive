import { act, type ReactNode } from 'react'
import { onTestFinished, vi } from 'vitest'
import paneStyles from '../../../docs/mockups/src/components/chat/ChatPane.module.css'
import pictureStyles from '../../../docs/mockups/src/components/chat/AnswerPicture.module.css'
import type { ChatPictures, PictureRead } from '../../files/page/picture-reads'
import type { FileEntry } from '../../shared/generated/FileEntry'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { deferred, mount, type Deferred } from '../../test-support/mount'
import { ChatPane } from '../components/ChatPane'
import {
  MentionsProvider,
  type ChatMentions,
} from '../mentions/MentionsContext'
import { LinksProvider } from './LinksContext'
import { Copying } from './mention-copy-test-kit'

// The helpers of the DOM tests of the pictures of answers. Tests only.

const file = (path: string): FileEntry => ({
  path,
  name: path.slice(path.lastIndexOf('/') + 1),
  kind: 'file',
  change: null,
})

/** The files of the tree of the tests: two screenshots. */
const entries = [file('shots/after.png'), file('shots/before.png')]

/** The bytes of a screenshot, as the reader gives them. */
export const shotAddress = 'data:image/png;base64,c2NyZWVuc2hvdA=='

/**
 * A stand-in for `IntersectionObserver`, which happy-dom never calls. It
 * keeps each observer with its options and its elements. `come` calls each
 * observer as a browser does when its elements come near the view.
 */
export function fakeNearView() {
  const observers: FakeObserver[] = []
  class FakeObserver implements IntersectionObserver {
    readonly root: Element | Document | null
    readonly rootMargin: string
    readonly scrollMargin = '0px'
    readonly thresholds: readonly number[] = [0]
    readonly targets = new Set<Element>()
    private readonly callback: IntersectionObserverCallback

    constructor(
      callback: IntersectionObserverCallback,
      options: IntersectionObserverInit = {},
    ) {
      this.callback = callback
      this.root = options.root ?? null
      this.rootMargin = options.rootMargin ?? '0px'
      observers.push(this)
    }
    observe(target: Element) {
      this.targets.add(target)
    }
    unobserve(target: Element) {
      this.targets.delete(target)
    }
    disconnect() {
      this.targets.clear()
    }
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
    /** Each element of this observer comes near the view. */
    near() {
      const entries = [...this.targets].map((target) => {
        const box = target.getBoundingClientRect()
        return {
          target,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: box,
          intersectionRect: box,
          rootBounds: null,
          time: 0,
        }
      })
      if (entries.length > 0) this.callback(entries, this)
    }
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver)
  onTestFinished(() => {
    vi.unstubAllGlobals()
  })
  return {
    observers,
    /** Each watched element comes near the view. */
    come() {
      act(() => {
        for (const observer of [...observers]) observer.near()
      })
    },
  }
}

/** A read of the fake reader, with the reply that the test gives. */
interface FakeRead {
  path: string
  message: string | undefined
  signal: AbortSignal
  reply: Deferred<PictureRead>
}

/** A picture reader whose reads wait until the test answers them. */
export function fakeReader() {
  const reads: FakeRead[] = []
  const reader: ChatPictures = {
    read(path, signal, message) {
      const reply = deferred<PictureRead>()
      reads.push({ path, message, signal, reply })
      return reply.promise
    },
  }
  return {
    reader,
    reads,
    /** Each read, as the path and the message that it reads. */
    asked: () => reads.map(({ path, message }) => ({ path, message })),
    /** Ends a read with `read`, and lets the chat show the outcome. */
    async answer(index: number, read: PictureRead) {
      await act(async () => {
        reads[index]?.reply.resolve(read)
      })
    },
  }
}

/**
 * Mounts `content` in the chat pane of a workspace with a tree that holds
 * the screenshots, and with `reader` as the picture reader of the chat,
 * as while the cloud computer runs. A press on a file notes its path.
 */
export async function mountPictures(content: ReactNode, reader?: ChatPictures) {
  const opened: string[] = []
  const snapshot = {
    tree: { entries: new Map(entries.map((entry) => [entry.path, entry])) },
    treeError: null,
    treeUnavailable: false,
  }
  const mentions: ChatMentions = {
    files: { subscribe: () => () => undefined, getSnapshot: () => snapshot },
    pictures: reader,
    openFile: (path) => opened.push(path),
    showFolder: () => undefined,
    href: (entry) => `/files/${entry.path}`,
  }
  const view = await mount(
    <LinksProvider value={{ links: { orgId: FAKE_IDS.org, workspaces: [] } }}>
      <MentionsProvider value={mentions}>
        <Copying>
          <ChatPane footer={null} mobile={false} sent={[]}>
            {content}
          </ChatPane>
        </Copying>
      </MentionsProvider>
    </LinksProvider>,
  )
  const scroller = view.container.querySelector(`.${paneStyles.scroll}`)
  return { ...view, opened, scroller }
}

/** What an image of a file shows: a link, the box of its label, or a picture. */
function stateOf(link: HTMLAnchorElement) {
  if (link.classList.contains(pictureStyles.loading)) return 'box'
  if (link.classList.contains(pictureStyles.picture)) return 'picture'
  return 'link'
}

/**
 * Each link to a file in `root`, as a reader sees it: its name, what it
 * shows, the element of the text that holds it, and its title.
 */
export function imagesIn(root: Element) {
  return Array.from(root.querySelectorAll('a'), (link) => ({
    name: link.querySelector('img')?.alt ?? link.textContent,
    shows: stateOf(link),
    in: link.closest('p, li, h1, h2, h3, td, th, summary')?.tagName,
    title: link.title,
  }))
}
