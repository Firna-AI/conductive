import type { WorkspaceEvent } from '../../shared/events'
import type { Session } from '../../shared/generated/Session'
import {
  secretAnswerPath,
  type SecretRequest,
} from '../../shared/secret-requests'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import type { FakeMacScenario } from '../../test-support/fixtures/devices'
import {
  asks,
  late,
  request,
  SECRET_TURN,
} from '../../test-support/fixtures/secret-requests'
import type { RecordedChatScenario } from '../../test-support/recorded-chat'
import { sessionMarkup, textOf } from '../components/render-kit'
import { withSessions } from '../state/linked-kit'
import { chatFor } from '../state/test-kit'

// The helpers of the tests of secret requests in the chat.

/** The name of the stack of the requests above the composer. */
export const stackName = 'Requests that wait for an answer'

/** The event of a state of a request of the shown session, at its time. */
export function updated(item: SecretRequest): [WorkspaceEvent, number] {
  return [
    {
      type: 'secrets.request.updated',
      sessionId: FAKE_IDS.session,
      request: item,
    },
    item.updatedAt,
  ]
}

/** A late request of the secret turn for PROD_DATABASE_URL, made at `at`. */
export function lateRequest(
  id: string,
  at: number,
  reason: string,
): SecretRequest {
  return request(id, asks.database, at, {
    ...late(at),
    turnId: SECRET_TURN,
    reason,
  })
}

/** The answer path of a request of the fake workspace. */
export function answerPathOf(item: SecretRequest): string {
  return secretAnswerPath(FAKE_IDS.org, FAKE_IDS.workspace, item.id)
}

/** The paths and the bodies of the answers that the chat sent, in order. */
export async function answersSent(
  server: FakeApiServer,
): Promise<{ path: string; body: unknown }[]> {
  const sent = server.requests.filter(
    (item) => item.method === 'POST' && item.url.includes('/secret-requests/'),
  )
  return Promise.all(
    sent.map(async (item) => ({
      path: new URL(item.url).pathname,
      body: (await item.clone().json()) as unknown,
    })),
  )
}

/** The text of each card with this name in the document, in its order. */
export function textsOf(label: string): string[] {
  const cards = document.querySelectorAll(`section[aria-label="${label}"]`)
  return Array.from(cards, (card) => textOf(card.outerHTML).trim())
}

/**
 * Puts events into the stored history of the fake, after its recorded
 * events, in their order, each at its time.
 */
export function storeEvents(
  server: FakeApiServer,
  events: readonly (readonly [WorkspaceEvent, number])[],
): void {
  for (const [event, occurredAt] of events) {
    const through = server.events.history(Number.MAX_SAFE_INTEGER)
    server.events.emit({
      workspaceId: FAKE_IDS.workspace,
      eventNumber: through.throughEventNumber + 1,
      occurredAt,
      event,
    })
  }
}

/**
 * The chat of the recorded conversation with the secret events in its
 * history, loaded, with its open session as a page of elements. `readOnly`
 * shows the workspace read-only, as a suspended org does. `sessions`
 * changes each open session record of the fake, such as its login.
 * `macCommands` gives the workspace Mac commands, and `onMac` makes the
 * window the Mac app on the Mac that got them.
 */
export async function renderSecrets(options: {
  events: readonly (readonly [WorkspaceEvent, number])[]
  conversation?: RecordedChatScenario
  readOnly?: boolean
  sessions?: (session: Session) => Session
  macCommands?: FakeMacScenario
  onMac?: boolean
}): Promise<HTMLElement> {
  const chat = chatFor({
    conversation: options.conversation ?? 'history',
    macCommands: options.macCommands,
    onMac: options.onMac,
  })
  if (options.sessions) withSessions(chat.server, options.sessions)
  storeEvents(chat.server, options.events)
  await chat.controller.start()
  const page = document.createElement('div')
  page.innerHTML = sessionMarkup(chat.controller, {
    readOnly: options.readOnly,
  })
  return page
}

/** The secret cards of a page, each with whether a closed fold holds it. */
export function cardsOf(page: ParentNode): string[] {
  const cards = page.querySelectorAll(
    'section[aria-label^="Request for"], section[aria-label^="Command with"]',
  )
  return Array.from(cards, (card) => {
    const name = card.getAttribute('aria-label') ?? ''
    if (card.closest(`[aria-label="${stackName}"]`)) {
      return `${name} (above the composer)`
    }
    return card.closest('details') ? `${name} (in the fold)` : name
  })
}

/**
 * The stack of the requests above the composer: the place of its card on
 * top, such as "1 of 3", or null with one card, and the name of that card.
 */
export function stackOf(page: ParentNode): {
  place: string | null
  top: string | null
} {
  const stack = page.querySelector(`[aria-label="${stackName}"]`)
  const place = stack?.querySelector('[aria-live="polite"]')
  const top = stack?.querySelector('section[aria-label]')
  return {
    place: place ? textOf(place.outerHTML).trim() : null,
    top: top?.getAttribute('aria-label') ?? null,
  }
}

/** The text of one card, with its parts joined by spaces. */
export function textOfCard(page: ParentNode, label: string): string {
  const card = page.querySelector(`section[aria-label="${label}"]`)
  return textOf(card?.outerHTML ?? '').trim()
}
