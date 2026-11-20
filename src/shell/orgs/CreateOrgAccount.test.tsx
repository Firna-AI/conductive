// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { HeldRequests } from '../../app/test-kit'
import { ACCOUNT_PATHS } from '../../shared/account'
import { API_PATHS } from '../../shared/api'
import {
  operatorProvidersPath,
  type OperatorProvidersResponse,
} from '../../shared/operator-providers'
import {
  accessibleName,
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { click, mountScreen, settle, typeText } from '../test-mount'
import { startedApp } from '../test-render'
import { fieldNamed } from '../workspace/kept-test-kit'
import { CreateOrgScreen } from './CreateOrgScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const providersPath = operatorProvidersPath()

/** The create of a person who keeps By weights: no provider account. */
const byWeights = { name: 'Firna', repositoryIds: [7] }

const notLoaded = "The provider accounts didn't load"

/** The reply of the Worker with these configured account IDs. */
function configured(...ids: readonly string[]): OperatorProvidersResponse {
  return {
    accounts: ids.map((id) => ({
      id,
      weight: id === 'boat' ? 100 : 0,
      orgs: 0,
    })),
    updatedAt: null,
    operator: null,
  }
}

/** A server whose person signed in is an operator. */
function operatorServer(): FakeApiServer {
  const server = new FakeApiServer()
  server.json('GET', ACCOUNT_PATHS.account, {
    ...coreFixtures().account,
    operator: true,
  })
  return server
}

/**
 * Create org of another org or of the first org over `server`, with the
 * name typed and a repository added, so Create org is on. The spinner of
 * a read that waits animates, so the animation frames wait until the test
 * ends.
 */
async function readyForm(
  server: FakeApiServer,
  options: {
    first?: boolean
    services?: Parameters<typeof startedApp>[1]
  } = {},
) {
  holdAnimationFrames()
  const app = await startedApp(server, options.services)
  const view = mountScreen(
    app,
    <CreateOrgScreen first={options.first ?? false} />,
  )
  await settle()
  typeText(fieldNamed(view, 'Name'), 'Firna')
  click(byRole('button', 'Add firna/components', view))
  return { app, view }
}

/** Presses Create org, and gives the body of the create that the server got. */
async function create(server: FakeApiServer, view: HTMLElement) {
  click(byRole('button', 'Create org', view))
  await settle()
  const sent = server.requests.find(
    (request) =>
      request.method === 'POST' &&
      new URL(request.url).pathname === API_PATHS.orgs,
  )
  return sent ? await sent.clone().json() : null
}

/** The options of the account choice, with the chosen one marked. */
function choiceOf(view: HTMLElement): string[] {
  const group = byRole('radiogroup', 'Provider account', view)
  return Array.from(group.querySelectorAll('[role="radio"]'), (radio) =>
    radio.getAttribute('aria-checked') === 'true'
      ? `${accessibleName(radio)} (chosen)`
      : accessibleName(radio),
  )
}

describe('the provider account of Create org', () => {
  test('an operator gets By weights and every configured account, and the create sends only a chosen account, on another org and on the first org', async () => {
    const another = operatorServer()
    another.json('GET', providersPath, configured('boat', 'e2b', 'e2b-us'))
    const anotherForm = await readyForm(another)
    const offered = choiceOf(anotherForm.view)
    click(byRole('radio', 'e2b', anotherForm.view))
    const chosen = choiceOf(anotherForm.view)
    const anotherBody = await create(another, anotherForm.view)
    const first = operatorServer()
    first.json('GET', providersPath, configured('boat', 'e2b'))
    const firstForm = await readyForm(first, { first: true })
    const firstOffered = choiceOf(firstForm.view)
    const firstBody = await create(first, firstForm.view)
    expect({ offered, chosen, anotherBody, firstOffered, firstBody }).toEqual({
      offered: ['By weights (chosen)', 'boat', 'e2b', 'e2b-us'],
      chosen: ['By weights', 'boat', 'e2b (chosen)', 'e2b-us'],
      anotherBody: { ...byWeights, providerAccount: 'e2b' },
      firstOffered: ['By weights (chosen)', 'boat', 'e2b'],
      firstBody: byWeights,
    })
  })

  test('Create org of an operator does not wait for the accounts, a failed read offers Try again, and a refused read takes the choice away', async () => {
    const waiting = operatorServer()
    const held = new HeldRequests(waiting)
    held.hold('GET', providersPath)
    const pending = await readyForm(waiting, {
      services: { fetch: held.fetch },
    })
    const waitingField = queryByRole(
      'radiogroup',
      'Provider account',
      pending.view,
    )
    const waitingBody = await create(waiting, pending.view)
    held.release('GET', providersPath)
    await settle()

    const failing = operatorServer()
    failing.json(
      'GET',
      providersPath,
      { error: { code: 'internal_error', message: 'The request failed.' } },
      500,
    )
    const failed = await readyForm(failing)
    const failedTitle = queryByText(notLoaded, failed.view)?.textContent ?? null
    const failedBody = await create(failing, failed.view)
    failing.json('GET', providersPath, configured('boat', 'e2b'))
    click(byRole('button', 'Try again', failed.view))
    await settle()

    const refusing = operatorServer()
    refusing.json(
      'GET',
      providersPath,
      {
        error: {
          code: 'operator_required',
          message: 'Operator access is required.',
        },
      },
      403,
    )
    const refused = await readyForm(refusing)
    const refusedState = {
      field: queryByRole('radiogroup', 'Provider account', refused.view),
      notice: queryByText(notLoaded, refused.view),
      operator: refused.app.account.account.get()?.operator,
    }
    const refusedBody = await create(refusing, refused.view)
    expect({
      waiting: { field: waitingField, body: waitingBody },
      failed: {
        title: failedTitle,
        body: failedBody,
        retried: choiceOf(failed.view),
      },
      refused: { ...refusedState, body: refusedBody },
    }).toEqual({
      waiting: { field: null, body: byWeights },
      failed: {
        title: notLoaded,
        body: byWeights,
        retried: ['By weights (chosen)', 'boat', 'e2b'],
      },
      refused: { field: null, notice: null, operator: false, body: byWeights },
    })
  })
})
