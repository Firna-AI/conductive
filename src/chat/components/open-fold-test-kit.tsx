import { vi } from 'vitest'
import { createApiClient } from '../../app/api/client'
import type { WorkspaceEvent } from '../../shared/events'
import { byLabel, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  mount,
  press,
  waitFor,
} from '../../test-support/mount'
import type { SubscribeToWorkspace } from '../stream/workspace-stream'
import { WorkspaceChat } from '../WorkspaceChat'
import { ended, said, update } from './event-kit'
import { textOf } from './render-kit'

const answer = 'The form now suggests addresses.'

/** The message of four blocks: two paragraphs, each with a list after it. */
const plan = [
  'The proxy already returns predictions, so the work is in the form:',
  '- Add a `useAddressAutocomplete` hook',
  '',
  'Then, in this order:',
  '1. Fill the other fields',
  '2. Run the tests',
].join('\n')

/**
 * Mounts the chat of the recorded turn, which goes on with the messages of
 * `work`, by default a message of four blocks, then a call and its answer,
 * then a call after the answer, and finishes. `emit` sends a later event of
 * the workspace. `onOpenPage` gets each page that a workspace chip opens.
 */
export async function mountFinishedTurn(
  options: {
    work?: readonly string[]
    onOpenPage?: (to: string) => void
  } = {},
) {
  holdAnimationFrames()
  const server = new FakeApiServer({ conversation: 'running' })
  const emit = (event: WorkspaceEvent) =>
    server.events.emit({
      workspaceId: FAKE_IDS.workspace,
      eventNumber: server.events.history().throughEventNumber + 1,
      occurredAt: FAKE_TIME,
      event,
    })
  const work = options.work ?? [plan]
  work.forEach((text, index) => emit(said(`plan-${index + 2}`, text)))
  emit(update('lint', 'npm run lint', 0))
  emit(said('answer-3', answer))
  emit(update('unit', 'npm test', 0))
  emit(ended('finished'))
  const subscribe: SubscribeToWorkspace = (_target, after, listener) =>
    server.events.subscribe(after, (message) => listener.message(message))
  await mount(
    <WorkspaceChat
      client={createApiClient(server.fetch)}
      onOpenPage={options.onOpenPage}
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
export function foldOf(element: Element): HTMLDetailsElement {
  const details = element.closest('details')
  if (!details) throw new Error('The element is in no fold')
  return details
}

/** The line of the fold or the message line that holds the element. */
export function lineOf(element: Element): HTMLElement {
  const line = foldOf(element).querySelector<HTMLElement>(':scope > summary')
  if (!line) throw new Error('The fold has no line')
  return line
}

/** The text of an element, with each tag as a space. */
export const textIn = (element: Element) => textOf(element.innerHTML).trim()

/**
 * Lays the line out at `top` in the chat. The chat keeps its bottom in
 * place, so a fold that opens pushes its line up by the height that it
 * adds, unless the chat scrolls.
 */
export function place(line: HTMLElement, top: number, adds: number) {
  const scroller = byLabel('Chat').firstElementChild
  if (!(scroller instanceof HTMLElement)) throw new Error('No chat scrolls')
  vi.spyOn(line, 'getBoundingClientRect').mockImplementation(() =>
    DOMRect.fromRect({
      y: top - (foldOf(line).open ? adds : 0) - scroller.scrollTop,
      height: 24,
    }),
  )
}

/**
 * The blocks of a message line in its fold, outside its line: a paragraph
 * as its text, and a table as the text of its cells, row by row.
 */
export function bodyOf(line: HTMLElement): (string | string[][])[] {
  return Array.from(foldOf(line).querySelectorAll('p, table'), (block) =>
    block.tagName === 'TABLE'
      ? Array.from(block.querySelectorAll('tr'), (row) =>
          Array.from(row.children, textIn),
        )
      : textIn(block),
  )
}

/** Presses the line, then reads whether its fold is open, and its top. */
export async function pressed(line: HTMLElement) {
  await press(line)
  return { open: foldOf(line).open, top: line.getBoundingClientRect().top }
}
