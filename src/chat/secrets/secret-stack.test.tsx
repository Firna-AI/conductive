// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import type { SecretRequest } from '../../shared/secret-requests'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  asks,
  late,
  request,
  second,
} from '../../test-support/fixtures/secret-requests'
import { cardsOf, renderSecrets, stackOf, textOfCard } from './secret-test-kit'

const sessionId = FAKE_IDS.session

function updated(item: SecretRequest): [WorkspaceEvent, number] {
  return [
    { type: 'secrets.request.updated', sessionId, request: item },
    item.updatedAt,
  ]
}

/** A request of the running turn whose call ended 90 seconds after it. */
function lateRequest(
  id: string,
  ask: (typeof asks)[keyof typeof asks],
  at: number,
  change: Partial<SecretRequest> = {},
): SecretRequest {
  return request(id, ask, at, { ...late(at + 90 * second), ...change })
}

/** The names of the buttons of the stack, each marked when it is off. */
function stepsOf(page: ParentNode): string[] {
  const stack = page.querySelector(
    '[aria-label="Requests that wait for an answer"]',
  )
  const steps = stack?.querySelectorAll(
    'button[aria-label$=" request"], [role="button"][aria-label$=" request"]',
  )
  return Array.from(steps ?? [], (button) => {
    const name = button.getAttribute('aria-label') ?? ''
    const off =
      button.hasAttribute('disabled') ||
      button.getAttribute('aria-disabled') === 'true'
    return off ? `${name} (off)` : name
  })
}

describe('the stack of secret requests above the composer', () => {
  test('shows one card at a time: the request whose call waits on top of the late requests, with its place, Previous off, and Next', async () => {
    const page = await renderSecrets({
      conversation: 'running',
      events: [
        updated(lateRequest('preview', asks.preview, FAKE_TIME + 2 * second)),
        updated(lateRequest('mapbox', asks.mapbox, FAKE_TIME + 4 * second)),
        updated(request('count', asks.database, FAKE_TIME + 8 * second)),
      ],
    })
    expect({
      cards: cardsOf(page),
      stack: stackOf(page),
      steps: stepsOf(page),
    }).toEqual({
      cards: ['Request for PROD_DATABASE_URL (above the composer)'],
      stack: { place: '1 of 3', top: 'Request for PROD_DATABASE_URL' },
      steps: ['Previous request (off)', 'Next request'],
    })
  })

  test('shows the newest of three requests for the same secrets as one card that says how often the agent asked', async () => {
    const page = await renderSecrets({
      conversation: 'running',
      events: [
        updated(
          lateRequest('postcode', asks.database, FAKE_TIME + 2 * second, {
            reason: 'Count the addresses without a postcode.',
          }),
        ),
        updated(
          lateRequest('country', asks.database, FAKE_TIME + 4 * second, {
            reason: 'Count them by country.',
          }),
        ),
        updated(
          lateRequest('cities', asks.database, FAKE_TIME + 6 * second, {
            reason: 'Find the cities with the most of them.',
          }),
        ),
      ],
    })
    const text = textOfCard(page, 'Request for PROD_DATABASE_URL')
    expect({
      cards: cardsOf(page),
      stack: stackOf(page),
      steps: stepsOf(page),
      head: text.slice(0, text.indexOf(' Deny')),
      reason: text.includes('Find the cities with the most of them.'),
    }).toEqual({
      cards: ['Request for PROD_DATABASE_URL (above the composer)'],
      stack: { place: null, top: 'Request for PROD_DATABASE_URL' },
      steps: [],
      head: 'PROD_DATABASE_URL Asked 3 times',
      reason: true,
    })
  })

  test('puts a waiting Mac command after a late secret request in a browser, and keeps it first in the Mac app on the Mac that got it', async () => {
    const events = [
      updated(lateRequest('database', asks.database, FAKE_TIME + 2 * second)),
    ]
    const browser = await renderSecrets({
      conversation: 'running',
      events,
      macCommands: 'waiting',
    })
    const mac = await renderSecrets({
      conversation: 'running',
      events,
      macCommands: 'waiting',
      onMac: true,
    })
    expect({ browser: stackOf(browser), mac: stackOf(mac) }).toEqual({
      browser: { place: '1 of 2', top: 'Request for PROD_DATABASE_URL' },
      mac: { place: '1 of 2', top: 'Run a command on this Mac?' },
    })
  })
})
