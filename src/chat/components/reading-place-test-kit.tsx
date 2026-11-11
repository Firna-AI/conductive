import { act } from 'react'
import { vi } from 'vitest'
import { createApiClient } from '../../app/api/client'
import type { WorkspaceEvent } from '../../shared/events'
import { byLabel, byText, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { holdAnimationFrames, mount, waitFor } from '../../test-support/mount'
import type { SubscribeToWorkspace } from '../stream/workspace-stream'
import { WorkspaceChat } from '../WorkspaceChat'
import { ended, said, turn, update } from './event-kit'

const { message } = workspaceFixtures()

/** The member message of the recorded turn that the reader reads. */
export const older = 'Now the postcode field.'

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
 * Mounts the chat of the long turn with a stand-in for `ResizeObserver`,
 * which happy-dom never calls. `resize` calls each connected observer as a
 * browser does after a layout, and `emit` sends a later event of the
 * workspace. `scroller` and `transcript` are the boxes of the chat now.
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
        this.entry = { callback, self: this }
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
  await mount(
    <WorkspaceChat
      client={createApiClient(server.fetch)}
      orgId={FAKE_IDS.org}
      subscribe={subscribe}
      viewport="desktop"
      workspaceId={FAKE_IDS.workspace}
    />,
  )
  await waitFor(() => queryByText('Each field has its tests.'), 'the long turn')
  const { scroller, transcript } = chatBoxes()
  const resize = () =>
    act(async () => {
      for (const { callback, self } of observers) callback([], self)
    })
  return { scroller, transcript, server, emit, resize }
}

/** The box of the chat that scrolls, and the transcript in it. */
export function chatBoxes() {
  const scroller = byLabel('Chat').firstElementChild
  const transcript = scroller?.firstElementChild
  if (!(scroller instanceof HTMLElement && transcript instanceof HTMLElement)) {
    throw new Error('No transcript scrolls')
  }
  return { scroller, transcript }
}

/**
 * Lays the chat out as a browser lays out its reversed scroll box without
 * scroll anchoring: the box shows 120 px from 100 px down, each row of the
 * transcript is 40 px high, and the scroll position counts up from the
 * bottom to 0. A row's top follows the rows below it. A browser keeps each
 * position in the range.
 */
export function layOut(scroller: HTMLElement, transcript: HTMLElement) {
  const [top, height, row] = [100, 120, 40]
  const rows = () => Array.from(transcript.children)
  const content = () => rows().length * row
  const below = (element: Element) =>
    (rows().length - rows().indexOf(element)) * row
  let position = 0
  Object.defineProperty(scroller, 'scrollTop', {
    configurable: true,
    get: () => position,
    set: (value: number) => {
      position = Math.min(0, Math.max(height - content(), value))
    },
  })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      if (this === scroller) return DOMRect.fromRect({ y: top, height })
      const own =
        this === transcript
          ? rows()[0]
          : rows().find((element) => element.contains(this))
      // Any other part of the page, such as the tab row, gets an empty box,
      // as a browser gives each element one.
      if (!own) return new DOMRect()
      const y = top + height - position - below(own)
      return DOMRect.fromRect({
        y,
        height: this === transcript ? content() : row,
      })
    },
  )
  const rowOf = (text: string) => {
    const shown = byText(text)
    const found = rows().find((element) => element.contains(shown))
    if (!found) throw new Error(`No row shows "${text}"`)
    return found
  }
  const scrolled = () => scroller.dispatchEvent(new Event('scroll'))
  return {
    rowOf,
    topOf: (element: Element) => element.getBoundingClientRect().top,
    /** Scrolls as the reader does, so that the row shows at this top. */
    read(element: Element, at: number) {
      scroller.scrollTop += element.getBoundingClientRect().top - at
      scrolled()
    },
    /**
     * Scrolls by this distance as the wheel of the reader does, also before
     * the observer of sizes hears of a change. A negative distance scrolls
     * up.
     */
    scrollBy(distance: number) {
      scroller.scrollTop += distance
      scrolled()
    },
    /** Scrolls to the bottom, as the reader does. */
    readTheEnd() {
      scroller.scrollTop = 0
      scrolled()
    },
    /**
     * A browser keeps the old distance from the bottom while it fits the
     * new range. Otherwise the chat moves to its top, and a scroll event
     * can report that move before the observer of sizes hears of it.
     */
    layoutAgain() {
      const before = position
      scroller.scrollTop = position
      if (position !== before) scrolled()
    },
  }
}
