import type { WorkspaceEvent } from '../../shared/events'
import type { Session } from '../../shared/generated/Session'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import type { FakeMacScenario } from '../../test-support/fixtures/devices'
import type { RecordedChatScenario } from '../../test-support/recorded-chat'
import { sessionMarkup, textOf } from '../components/render-kit'
import { withSessions } from '../state/linked-kit'
import { chatFor } from '../state/test-kit'

// The helpers of the tests of secret requests in the chat.

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
    if (card.closest('[aria-label="Requests that wait for an answer"]')) {
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
  const stack = page.querySelector(
    '[aria-label="Requests that wait for an answer"]',
  )
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
