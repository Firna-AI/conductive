// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { olderSecret } from '../../../docs/mockups/src/fixtures/secrets'
import type { WorkspaceEvent } from '../../shared/events'
import type { SecretRequest } from '../../shared/secret-requests'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  asks,
  late,
  priya,
  request,
  resultEvents,
  second,
  SECRET_TURN,
} from '../../test-support/fixtures/secret-requests'
import { secretTurn } from '../../test-support/fixtures/secret-turn'
import { textOf } from '../components/render-kit'
import { cardsOf, renderSecrets, textOfCard } from './secret-test-kit'

const sessionId = FAKE_IDS.session
/** The secret turn of the fixtures starts here, and its work runs after. */
const start = FAKE_TIME + 20 * second
const inWork = start + 300

function updated(item: SecretRequest): [WorkspaceEvent, number] {
  return [
    { type: 'secrets.request.updated', sessionId, request: item },
    item.updatedAt,
  ]
}

/** The names of the buttons of one card, in their order. */
function buttonsOf(page: ParentNode, label: string): string[] {
  const card = page.querySelector(`section[aria-label="${label}"]`)
  return Array.from(card?.querySelectorAll('button') ?? [], (button) =>
    textOf(button.outerHTML).trim(),
  )
}

/** The choices of how long the values of one card last, each marked when off. */
function lifetimesOf(page: ParentNode, label: string): string[] {
  const card = page.querySelector(`section[aria-label="${label}"]`)
  return Array.from(card?.querySelectorAll('[role="radio"]') ?? [], (radio) => {
    const name = textOf(radio.outerHTML).trim()
    return radio.getAttribute('aria-disabled') === 'true'
      ? `${name} (off)`
      : name
  })
}

describe('secret requests in the chat', () => {
  test('a request that waits for its tool call shows just above the composer with Deny and Allow for this session, and a read-only chat shows it with no choices', async () => {
    const waiting = request('waiting', asks.database, FAKE_TIME + 8 * second)
    const events = [updated(waiting)]
    const page = await renderSecrets({ conversation: 'running', events })
    const readOnly = await renderSecrets({
      conversation: 'running',
      events,
      readOnly: true,
    })
    const label = 'Request for PROD_DATABASE_URL'
    expect({
      cards: cardsOf(page),
      buttons: buttonsOf(page, label),
      facts: textOfCard(page, label),
      readOnly: buttonsOf(readOnly, label),
    }).toEqual({
      cards: [`${label} (above the composer)`],
      buttons: ['Deny', 'Allow for this session'],
      facts: expect.stringContaining(
        'Read-only replica of the production database. Reason Read the addresses that failed the postcode check. Command the agent says it will run',
      ),
      readOnly: [],
    })
  })

  test('a name that asks for a value and cannot become a secret keeps 15 minutes and This workspace, and turns Save as secret off for every value with a line that says why, and a secret of the org with such a name does not', async () => {
    const older = {
      name: olderSecret.name,
      secretId: 'cloudflare-read-only',
      description: olderSecret.description,
    }
    const page = await renderSecrets({
      conversation: 'running',
      events: [
        updated(request('providers', asks.providers, FAKE_TIME + 8 * second)),
        updated(
          request('older', asks.mapbox, FAKE_TIME + 9 * second, {
            secrets: [older, ...asks.mapbox.secrets],
          }),
        ),
      ],
    })
    const providers =
      'Request for PROD_DATABASE_URL, MAPBOX_TOKEN, Google Places key'
    const stored = 'Request for Cloudflare (read-only), MAPBOX_TOKEN'
    expect({
      providers: lifetimesOf(page, providers),
      providersText: textOfCard(page, providers),
      stored: lifetimesOf(page, stored),
      storedText: textOfCard(page, stored),
    }).toEqual({
      providers: ['15 minutes', 'This workspace', 'Save as secret (off)'],
      providersText: expect.stringContaining(
        'Save as secret needs each name to use only letters, digits, and underscores.',
      ),
      stored: ['15 minutes', 'This workspace', 'Save as secret'],
      storedText: expect.not.stringContaining('Save as secret needs'),
    })
  })

  test('each run folds with its turn, a request allowed in time shows once as its run, a request denied in time shows as a denied run, and a late request stays out of the fold', async () => {
    const page = await renderSecrets({
      events: secretTurn(start, resultEvents(inWork)),
    })
    expect({
      cards: cardsOf(page),
      allowed: textOfCard(page, 'Command with VERCEL_TOKEN'),
      preapproved: textOfCard(page, 'Command with FIGMA_TOKEN'),
      denied: textOfCard(page, 'Command with PROD_DATABASE_URL'),
    }).toEqual({
      cards: [
        'Command with VERCEL_TOKEN (in the fold)',
        'Command with FIGMA_TOKEN (in the fold)',
        'Command with PROD_DATABASE_URL (in the fold)',
        'Request for MAPBOX_TOKEN',
      ],
      allowed: expect.stringMatching(
        /^VERCEL_TOKEN Allowed Command the agent says it will run .* Allowed for this session by you$/,
      ),
      preapproved: expect.stringMatching(/Pre-approved for this workspace$/),
      denied: expect.stringMatching(
        /^PROD_DATABASE_URL Denied .* Priya Raman denied it\. The command did not run\.$/,
      ),
    })
  })

  test('a late request says that the agent stopped waiting, a late answer says who answered and what followed, also when the login of the starter is gone, with the line of the app, and an ended request says what ended it', async () => {
    const asked = { turnId: SECRET_TURN }
    const open = request('open', asks.database, inWork, {
      ...late(inWork),
      ...asked,
    })
    const unshared = request('unshared', asks.vercel, inWork + 100, {
      ...asked,
      state: 'allowed',
      late: true,
      answeredBy: priya,
      updatedAt: start + 90 * second,
      notice: { state: 'not-sent', reason: 'login-not-shared' },
    })
    const gone = request('gone', asks.preview, inWork + 150, {
      ...asked,
      state: 'allowed',
      late: true,
      answeredBy: priya,
      updatedAt: start + 91 * second,
      notice: { state: 'not-sent', reason: 'login-unavailable' },
    })
    const ended = request('ended', asks.mapbox, inWork + 200, {
      ...late(inWork + 200),
      ...asked,
      state: 'not-answered',
      endedBy: 'archived',
    })
    const page = await renderSecrets({
      events: secretTurn(start, [
        updated(open),
        updated(unshared),
        updated(gone),
        updated(ended),
      ]),
    })
    const results = await renderSecrets({
      events: secretTurn(start, resultEvents(inWork)),
    })
    expect({
      open: textOfCard(page, 'Request for PROD_DATABASE_URL'),
      buttons: buttonsOf(page, 'Request for PROD_DATABASE_URL'),
      unshared: textOfCard(page, 'Request for VERCEL_TOKEN'),
      gone: textOfCard(page, 'Request for VERCEL_TOKEN, MAPBOX_TOKEN'),
      ended: textOfCard(page, 'Request for MAPBOX_TOKEN'),
      given: textOfCard(results, 'Request for MAPBOX_TOKEN'),
      line: textOf(results.innerHTML),
    }).toEqual({
      open: expect.stringMatching(
        /The agent stopped waiting\. Allow tells it in a new turn\.$/,
      ),
      buttons: ['Deny', 'Allow for this session'],
      unshared: expect.stringMatching(
        /^VERCEL_TOKEN Allowed for this session .* Priya Raman answered\. The agent learns of it at the next message\.$/,
      ),
      gone: expect.stringMatching(
        /Priya Raman answered\. The agent learns of it when you connect Claude again\.$/,
      ),
      ended: expect.stringMatching(
        /^MAPBOX_TOKEN Not answered .* It ended when the workspace was archived\.$/,
      ),
      given: expect.stringMatching(
        /^MAPBOX_TOKEN Value for this workspace .* Priya Raman answered, and a new turn told the agent\.$/,
      ),
      line: expect.stringContaining(
        'Priya Raman gave MAPBOX_TOKEN for this workspace.',
      ),
    })
  })
})
