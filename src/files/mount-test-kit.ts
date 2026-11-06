import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { onTestFinished, vi } from 'vitest'
import type { FakeApiServer } from '../test-support/fake-api'
import { accessibleName } from '../test-support/dom-queries'
import type { FetchLike } from './api/files-client'
import { filesFor } from './files-test-kit'
import { parseMarkdown } from './markdown/markdown-document'
import type { WorkspaceFiles } from './model/files-store'

/**
 * Test kit of the mounted Files screens, for test files that run in
 * happy-dom. Tests only.
 */

/**
 * Mounts React nodes in a detached container, as the mounted GitHub tests
 * do. The test ends with an unmount, unless it unmounted already.
 *
 * happy-dom runs each animation frame as an immediate task, and a spinner
 * updates React on each frame, so `act` would never settle while one shows.
 * Frames never run here, so a spinner stays still.
 */
export function mountRoot() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  const container = document.createElement('div')
  const root = createRoot(container)
  let mounted = true
  const unmount = (): void => {
    if (!mounted) return
    mounted = false
    act(() => root.unmount())
  }
  onTestFinished(() => {
    unmount()
    vi.unstubAllGlobals()
  })
  return {
    container,
    render(node: ReactNode): void {
      act(() => root.render(node))
    },
    unmount,
  }
}

/**
 * A fetch of the fake API whose replies reach the screens only when the
 * test releases them inside `act`, as a slow network delivers them.
 */
export function heldFetch(server: FakeApiServer) {
  const held: (() => void)[] = []
  const replies: Promise<Response>[] = []
  const fetch: FetchLike = (input, init) => {
    const answer = server.fetch(input, init)
    const delivered = new Promise<void>((resolve) => {
      held.push(resolve)
    })
    const reply = delivered.then(() => answer)
    replies.push(reply)
    return reply
  }
  const release = async (): Promise<void> => {
    const released = replies.splice(0)
    for (const deliver of held.splice(0)) deliver()
    await Promise.all(released)
  }
  return { fetch, release }
}

/**
 * A started store that has read the tree and the changes routes. Its
 * stream starts after the recorded events, so the routes give both lists.
 */
export async function startedFiles(
  server: FakeApiServer,
  held: ReturnType<typeof heldFetch>,
): Promise<WorkspaceFiles> {
  const files = filesFor(
    server,
    (after, listener) =>
      server.events.subscribe(
        Math.max(after, server.events.history().throughEventNumber),
        listener,
      ),
    held.fetch,
  )
  files.start()
  onTestFinished(() => files.stop())
  await act(async () => {
    await held.release()
  })
  return files
}

/** The rows of the code or the diff on screen, as the texts of their cells. */
export function shownRows(container: HTMLElement): string[][] {
  return [...container.querySelectorAll('pre > div')].map((row) =>
    row.children.length === 0
      ? [row.textContent ?? '']
      : [...row.children].map((cell) => cell.textContent ?? ''),
  )
}

/** The role of a control: its `role`, or the role of a button or a link. */
function roleOf(element: Element): string | null {
  const implicit: Readonly<Record<string, string>> = {
    A: 'link',
    BUTTON: 'button',
  }
  return element.getAttribute('role') ?? implicit[element.tagName] ?? null
}

/**
 * Presses the one control with the role and the accessible name, as a
 * pointer user does: a click inside `act`. None or more than one fails.
 */
export function press(
  container: HTMLElement,
  role: 'button' | 'link' | 'radio',
  name: string,
): void {
  const found = [...container.querySelectorAll('*')].filter(
    (element) => roleOf(element) === role && accessibleName(element) === name,
  )
  if (found.length !== 1) {
    throw new Error(
      `${found.length} controls have role ${role} and name "${name}".`,
    )
  }
  const [control] = found
  if (!(control instanceof HTMLElement))
    throw new Error(`"${name}" is not an element.`)
  act(() => control.click())
}

/**
 * Module workers that the test answers by hand, in place of the browser's.
 * Each one records the texts that the view posts to it, and answers the
 * last one with the parse of the app.
 */
export function fakeWorkers() {
  const made: FakeWorker[] = []
  class FakeWorker {
    readonly options: WorkerOptions | undefined
    readonly posted: unknown[] = []
    ended = false
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: Event) => void) | null = null
    onmessageerror: ((event: MessageEvent) => void) | null = null

    constructor(_url: URL, options?: WorkerOptions) {
      this.options = options
      made.push(this)
    }

    postMessage(data: unknown): void {
      this.posted.push(data)
    }

    terminate(): void {
      this.ended = true
    }

    /** Delivers a reply, also one that was on its way when the view moved on. */
    answer(): void {
      const text = this.posted.at(-1)
      if (typeof text !== 'string') throw new Error('No text was posted.')
      const document = parseMarkdown(text)
      act(() =>
        this.onmessage?.(new MessageEvent('message', { data: document })),
      )
    }

    fail(): void {
      act(() => this.onerror?.(new Event('error')))
    }
  }
  vi.stubGlobal('Worker', FakeWorker)
  return {
    made,
    live: () => made.filter((worker) => !worker.ended),
  }
}
