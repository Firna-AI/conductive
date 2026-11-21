import { act, type ReactNode } from 'react'
import { onTestFinished, vi } from 'vitest'
import type { Session } from '../../shared/generated/Session'
import type { SessionAnchor } from '../../shared/generated/SessionAnchor'
import type { WorkspaceEvent } from '../../shared/events'
import { buildShortcutKeymap } from '../../app/shortcuts/keymap'
import { createApiClient } from '../../app/api/client'
import { ShortcutContext } from '../../shell/shortcuts/shortcut-context'
import { ShortcutOffers } from '../../shell/shortcuts/shortcut-offers'
import { FakeApiServer, type FakeApiOptions } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { holdAnimationFrames, mount } from '../../test-support/mount'
import { storeEvents } from '../secrets/secret-test-kit'
import type { SubscribeToWorkspace } from '../stream/workspace-stream'
import type { Clock } from '../ui/clock'
import { WorkspaceChat } from '../WorkspaceChat'

// The helpers of the DOM tests of Explain: the chat on the fake API with
// the shortcut layer, explanations in its history, the selection, and the
// highlights that a browser draws.

/** The answer of the recorded chat, which the tests explain. */
export const answer = {
  messageId: 'answer-1',
  text: 'The checkout form now suggests addresses. Manual entry still works.',
}

/** The anchor of a quote of the recorded answer. */
export function anchorOf(
  quote: string,
  fields: Partial<SessionAnchor> = {},
): SessionAnchor {
  const at = answer.text.indexOf(quote)
  return {
    parentSessionId: FAKE_IDS.session,
    messageId: answer.messageId,
    quote,
    before: answer.text.slice(0, Math.max(0, at)),
    after: at < 0 ? '' : answer.text.slice(at + quote.length),
    ...fields,
  }
}

/** The record of an explanation of the recorded chat, open and ended. */
export function explanation(
  id: string,
  anchor: SessionAnchor,
  fields: Partial<Session> = {},
): Session {
  const [parent] = workspaceFixtures().sessions.sessions
  if (!parent) throw new Error('The fixtures hold no session.')
  return {
    ...parent,
    id,
    title: `Explain "${anchor.quote}"`,
    createdAt: FAKE_TIME + 60_000,
    activeTurnId: null,
    activeTurnStartedAt: null,
    anchor,
    ...fields,
  }
}

/** The event of the record of a session. */
export const recordEvent = (session: Session): WorkspaceEvent => ({
  type: 'session.updated',
  session,
})

/**
 * The chat of the recorded conversation on a computer or a phone, with the
 * shortcut layer whose offers a test reads. `stored` goes into the history
 * of the fake after its recorded events, such as the records of
 * explanations. `clock` gives the time of the chat.
 */
export async function mountChat(
  options: FakeApiOptions & {
    stored?: readonly WorkspaceEvent[]
    viewport?: 'desktop' | 'mobile'
    readOnly?: boolean
    clock?: Clock
    setup?: (server: FakeApiServer) => void
  } = {},
) {
  holdAnimationFrames()
  const server = new FakeApiServer(options)
  storeEvents(
    server,
    (options.stored ?? []).map((event) => [event, FAKE_TIME + 60_000]),
  )
  options.setup?.(server)
  const subscribe: SubscribeToWorkspace = (_target, after, listener) =>
    server.events.subscribe(after, (message) => listener.message(message))
  const offers = new ShortcutOffers()
  const layer = {
    offers,
    terminals: new Set<HTMLElement>(),
    recorders: new Set<HTMLElement>(),
    keymap: buildShortcutKeymap('mac', []),
  }
  const element = (children: ReactNode) => (
    <ShortcutContext.Provider value={layer}>
      {children}
    </ShortcutContext.Provider>
  )
  const view = await mount(
    element(
      <WorkspaceChat
        client={createApiClient(server.fetch)}
        clock={options.clock}
        orgId={FAKE_IDS.org}
        readOnly={options.readOnly}
        subscribe={subscribe}
        viewport={options.viewport ?? 'desktop'}
        workspaceId={FAKE_IDS.workspace}
      />,
    ),
  )
  return { server, offers, view }
}

/** The text node that holds the text, under `root`. */
export function textNodeWith(root: Node, text: string): Text {
  if (root instanceof Text && root.data.includes(text)) return root
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node instanceof Text && node.data.includes(text)) return node
  }
  throw new Error(`No text node holds "${text}".`)
}

/** Lets the reads of the selection and the replies of the fake go on. */
async function settle(): Promise<void> {
  await act(async () => {
    document.dispatchEvent(new Event('selectionchange'))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

/** Selects a range of the page, as a drag of the pointer does. */
export async function select(range: Range): Promise<void> {
  const selection = document.getSelection()
  if (!selection) throw new Error('The page has no selection.')
  selection.removeAllRanges()
  selection.addRange(range)
  await settle()
}

/** Selects a part of the text of one text node. */
export async function selectText(root: Node, text: string): Promise<void> {
  const node = textNodeWith(root, text)
  const at = node.data.indexOf(text)
  const range = document.createRange()
  range.setStart(node, at)
  range.setEnd(node, at + text.length)
  await select(range)
}

/**
 * Draws highlights as a browser does, so a test reads the text of each
 * range of a layer of marks, such as `mark` or `active`.
 */
export function readHighlights(): (layer: string) => string[] {
  const registry = new Map<string, Set<AbstractRange>>()
  class TestHighlight extends Set<AbstractRange> {
    priority = 0
    constructor(...ranges: AbstractRange[]) {
      super(ranges)
    }
  }
  const css = globalThis.CSS
  vi.stubGlobal('Highlight', TestHighlight)
  vi.stubGlobal('CSS', {
    escape: (value: string) => css.escape(value),
    supports: (rule: string, value?: string) =>
      value === undefined ? css.supports(rule) : css.supports(rule, value),
    highlights: registry,
  })
  onTestFinished(() => {
    vi.unstubAllGlobals()
  })
  return (layer) =>
    [...(registry.get(`explain-${layer}`) ?? [])].map((range) =>
      range instanceof Range ? range.toString() : '',
    )
}
