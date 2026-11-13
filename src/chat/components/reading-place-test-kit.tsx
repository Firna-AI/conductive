import { act, useState, type ReactNode } from 'react'
import { onTestFinished, vi } from 'vitest'
import { createApiClient } from '../../app/api/client'
import type { WorkspaceEvent } from '../../shared/events'
import {
  byText,
  queryByLabel,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { holdAnimationFrames, mount, waitFor } from '../../test-support/mount'
import type { SubscribeToWorkspace } from '../stream/workspace-stream'
import { WorkspaceChat } from '../WorkspaceChat'
import { rowKeyAttribute } from './chat-place'
import { ended, said, turn, update } from './event-kit'

// The long turn of the chat and a browser layout of its reversed scroll box,
// for the tests of the reader's place. happy-dom lays out nothing, and its
// ResizeObserver never calls back.

export const { message } = workspaceFixtures()
export const older = 'Now the postcode field.'
export const fold = '16 tool calls, 16 messages'
export { ended }

/** A member message, and the start of the turn that takes it. */
function asks(id: string, text: string, turnId: string): WorkspaceEvent[] {
  return [
    { type: 'message.accepted', message: { ...message, id, text } },
    {
      ...turn,
      turnId,
      type: 'turn.started',
      senderId: message.sender.id,
      choice: message.choice,
      startedAt: FAKE_TIME,
      messageIds: [id],
    },
  ]
}

/** The recorded turn, a short turn, and a long turn of 16 steps that runs. */
const turns: WorkspaceEvent[] = [
  ...asks('ask-2', older, 'turn-2'),
  said('answer-2', 'The postcode field suggests too.', 'turn-2'),
  ended('finished', 'turn-2'),
  ...asks('ask-3', 'Add tests for each field.', 'turn-3'),
  ...Array.from({ length: 16 }, (_, step): WorkspaceEvent[] => [
    said(`step-${step}`, `Step ${step + 1}.`, 'turn-3'),
    {
      ...update(`call-${step}`, `npm test -- field-${step}`, 0),
      turnId: 'turn-3',
    },
  ]).flat(),
  said('answer-3', 'Each field has its tests.', 'turn-3'),
]

/**
 * Mounts the chat of the long turn with a stand-in for `ResizeObserver`.
 * `resize` calls each observer as a browser does after a layout, and `emit`
 * sends a later event of the workspace. `showPage` shows a page in place of
 * the chat of the session, as a file tab does, and null shows the chat.
 */
export async function mountLongTurn() {
  holdAnimationFrames()
  const observers = new Set<{
    callback: ResizeObserverCallback
    self: ResizeObserver
  }>()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private readonly entry
      constructor(callback: ResizeObserverCallback) {
        this.entry = { callback, self: this as unknown as ResizeObserver }
        observers.add(this.entry)
      }
      observe() {}
      unobserve() {}
      disconnect() {
        observers.delete(this.entry)
      }
    },
  )
  const server = new FakeApiServer({ conversation: 'history' })
  const emit = (event: WorkspaceEvent) =>
    server.events.emit({
      workspaceId: FAKE_IDS.workspace,
      eventNumber: server.events.history().throughEventNumber + 1,
      occurredAt: FAKE_TIME,
      event,
    })
  for (const event of turns) emit(event)
  const subscribe: SubscribeToWorkspace = (_target, after, listener) =>
    server.events.subscribe(after, (message) => listener.message(message))
  const client = createApiClient(server.fetch)
  let setPage: (page: ReactNode) => void = () => {}
  function Host() {
    const [page, set] = useState<ReactNode>(null)
    setPage = set
    return (
      <WorkspaceChat
        client={client}
        content={page}
        orgId={FAKE_IDS.org}
        subscribe={subscribe}
        viewport="desktop"
        workspaceId={FAKE_IDS.workspace}
      />
    )
  }
  await mount(<Host />)
  await waitFor(() => queryByText('Each field has its tests.'), 'the long turn')
  const resize = () =>
    act(async () => {
      for (const { callback, self } of observers) callback([], self)
    })
  const showPage = (page: ReactNode) => act(async () => setPage(page))
  return { emit, resize, showPage }
}

/** The scroll box of the chat and its transcript, while a transcript shows. */
function chatBox(): { scroller: HTMLElement; transcript: HTMLElement } | null {
  const scroller = queryByLabel('Chat')?.firstElementChild
  const transcript = scroller?.firstElementChild
  if (!(scroller instanceof HTMLElement && transcript instanceof HTMLElement)) {
    return null
  }
  const rows = transcript.querySelector(`:scope > [${rowKeyAttribute}]`)
  return rows ? { scroller, transcript } : null
}

/**
 * Lays the chat out as a browser lays out its reversed scroll box: the box
 * shows 120 px from 100 px down, each row of the transcript is 40 px high,
 * and the scroll position counts up from the bottom to 0. A row's top
 * follows the rows below it. A browser keeps each position in the range,
 * and a new box, such as after the chat shows again, starts at the bottom.
 */
export function layOutChat() {
  const [top, height, row] = [100, 120, 40]
  const box = () => {
    const found = chatBox()
    if (!found) throw new Error('No transcript scrolls')
    return found
  }
  const rows = () => Array.from(chatBox()?.transcript.children ?? [])
  const content = () => rows().length * row
  const below = (element: Element) =>
    (rows().length - rows().indexOf(element)) * row
  let position = 0
  let owner: Element | null = null
  const own = (element: Element) => {
    if (element !== chatBox()?.scroller) return false
    if (owner !== element) [owner, position] = [element, 0]
    return true
  }
  const saved = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')
  if (!saved?.get || !saved.set) throw new Error('happy-dom has no scrollTop')
  const { get, set } = saved
  Object.defineProperty(Element.prototype, 'scrollTop', {
    configurable: true,
    get(this: Element) {
      return own(this) ? position : (get.call(this) as number)
    },
    set(this: Element, value: number) {
      if (!own(this)) return set.call(this, value)
      position = Math.min(0, Math.max(height - content(), value))
    },
  })
  onTestFinished(() => {
    Object.defineProperty(Element.prototype, 'scrollTop', saved)
  })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      const shown = chatBox()
      if (this === shown?.scroller) {
        return DOMRect.fromRect({ y: top, height })
      }
      const rowOwn =
        this === shown?.transcript
          ? rows()[0]
          : rows().find((element) => element.contains(this))
      // Any other part of the page, such as the tab row, gets an empty box,
      // as a browser gives each element one.
      if (!shown || !rowOwn) return new DOMRect()
      // A new box starts at the bottom, also before its first scroll.
      own(shown.scroller)
      const y = top + height - position - below(rowOwn)
      return DOMRect.fromRect({
        y,
        height: this === shown?.transcript ? content() : row,
      })
    },
  )
  const rowOf = (text: string) => {
    const shown = byText(text)
    const found = rows().find((element) => element.contains(shown))
    if (!found) throw new Error(`No row shows "${text}"`)
    return found
  }
  const scroll = () => box().scroller.dispatchEvent(new Event('scroll'))
  return {
    rowOf,
    scrollTop: () => box().scroller.scrollTop,
    topOf: (element: Element) => element.getBoundingClientRect().top,
    /** Scrolls as the reader does, so that the row shows at this top. */
    read(element: Element, at: number) {
      box().scroller.scrollTop += element.getBoundingClientRect().top - at
      scroll()
    },
    /** Scrolls to the bottom, as the reader does. */
    readTheEnd() {
      box().scroller.scrollTop = 0
      scroll()
    },
    /**
     * A browser keeps the old distance from the bottom while it fits the
     * new range. Otherwise the chat moves to its top, and a scroll event
     * can report that move before the observer of sizes hears of it.
     */
    layoutAgain() {
      const before = position
      box().scroller.scrollTop = position
      if (position !== before) scroll()
    },
  }
}
