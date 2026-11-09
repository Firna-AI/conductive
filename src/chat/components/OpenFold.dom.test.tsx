// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../../app/api/client'
import type { WorkspaceEvent } from '../../shared/events'
import { byLabel, byText, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import type { SubscribeToWorkspace } from '../stream/workspace-stream'
import { WorkspaceChat } from '../WorkspaceChat'
import { ended, said, update } from './event-kit'
import { textOf } from './render-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const answer = 'The form now suggests addresses.'
const plan = [
  'The proxy already returns predictions, so the work is in the form:',
  '- Add a `useAddressAutocomplete` hook',
  '',
  'Then, in this order:',
  '1. Fill the other fields',
  '2. Run the tests',
].join('\n')
const blocks = [
  'The proxy already returns predictions, so the work is in the form:',
  'Add a useAddressAutocomplete hook',
  'Then, in this order:',
  '1. Fill the other fields',
  '2. Run the tests',
]
const planLine = blocks.join(' ')

/**
 * Mounts the chat of the recorded turn, which goes on with a message of
 * four blocks, a call, and its answer, then a call after the answer, and
 * finishes. `emit` sends a later event of the workspace.
 */
async function mountFinishedTurn() {
  holdAnimationFrames()
  const server = new FakeApiServer({ conversation: 'running' })
  const emit = (event: WorkspaceEvent) =>
    server.events.emit({
      workspaceId: FAKE_IDS.workspace,
      eventNumber: server.events.history().throughEventNumber + 1,
      occurredAt: FAKE_TIME,
      event,
    })
  emit(said('plan-2', plan))
  emit(update('lint', 'npm run lint', 0))
  emit(said('answer-3', answer))
  emit(update('unit', 'npm test', 0))
  emit(ended('finished'))
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
  await waitFor(() => queryByText(answer), 'the answer of the turn')
  return { emit }
}

/** The `<details>` of a fold or a message line, from an element of its line. */
function foldOf(element: Element): HTMLDetailsElement {
  const details = element.closest('details')
  if (!details) throw new Error('The element is in no fold')
  return details
}

/** The line of the fold or the message line that holds the element. */
function lineOf(element: Element): HTMLElement {
  const line = foldOf(element).querySelector<HTMLElement>(':scope > summary')
  if (!line) throw new Error('The fold has no line')
  return line
}

/** The text of an element, with each tag as a space. */
const textIn = (element: Element) => textOf(element.innerHTML).trim()

describe('an open fold', () => {
  it('lists its steps in order, opens a message line to its full text, and keeps both choices', async () => {
    const { emit } = await mountFinishedTurn()
    const line = byText('2 tool calls, 2 messages')
    expect(foldOf(line).open).toBe(false)

    await press(line)
    const steps = foldOf(line).querySelectorAll(':scope > ul > li')
    expect({
      open: foldOf(line).open,
      steps: Array.from(steps, textIn),
    }).toEqual({
      open: true,
      steps: [
        'I will check the checkout form.',
        'Read src/app/checkout/AddressForm.tsx',
        planLine,
        'Ran npm run lint',
      ],
    })

    const message = lineOf(byText(planLine))
    expect(foldOf(message).open).toBe(false)
    await press(message)
    expect({
      open: foldOf(message).open,
      blocks: blocks.map((block) => queryByText(block, message)?.tagName),
      // A summary holds only phrasing content, so each block is a span.
      flow: message.querySelectorAll('p, ul, ol, li, pre, div').length,
    }).toEqual({ open: true, blocks: blocks.map(() => 'SPAN'), flow: 0 })

    const next = { ...workspaceFixtures().message, id: 'ask-2' }
    await act(async () =>
      emit({ type: 'message.accepted', message: { ...next, text: 'Thanks.' } }),
    )
    await waitFor(() => queryByText('Thanks.'), 'the next message')
    // The chat draws again, so the test finds both lines again.
    const shown = [byText('2 tool calls, 2 messages'), byText(planLine)]
    expect(shown.map((element) => foldOf(element).open)).toEqual([true, true])
  })

  it('keeps its line in place when the user opens or closes it: a work fold, a run of tool calls, and a message line', async () => {
    await mountFinishedTurn()
    const scroller = byLabel('Chat').firstElementChild
    if (!(scroller instanceof HTMLElement)) throw new Error('No chat scrolls')
    // The chat keeps its bottom in place, so a fold that opens pushes its
    // line up by the height that it adds, unless the chat scrolls.
    const place = (line: HTMLElement, top: number, adds: number) =>
      vi.spyOn(line, 'getBoundingClientRect').mockImplementation(() =>
        DOMRect.fromRect({
          y: top - (foldOf(line).open ? adds : 0) - scroller.scrollTop,
          height: 24,
        }),
      )
    /** Presses the line, then reads whether its fold is open, and its top. */
    const pressed = async (line: HTMLElement) => {
      await press(line)
      return {
        open: foldOf(line).open,
        top: line.getBoundingClientRect().top,
      }
    }
    const work = byText('2 tool calls, 2 messages')
    const run = byText('1 tool call')
    place(work, 148, 382)
    place(run, 600, 48)
    expect([
      await pressed(work),
      await pressed(work),
      await pressed(run),
      await pressed(run),
    ]).toEqual([
      { open: true, top: 148 },
      { open: false, top: 148 },
      { open: true, top: 600 },
      { open: false, top: 600 },
    ])

    // The open work fold moves the chat 382 px, so the message line shows
    // at 220 + 382 px.
    await pressed(work)
    const message = lineOf(byText(planLine))
    place(message, 220, 96)
    expect([await pressed(message), await pressed(message)]).toEqual([
      { open: true, top: 602 },
      { open: false, top: 602 },
    ])
  })
})
