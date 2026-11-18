// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { HeldRequests } from '../../app/test-kit'
import { orgAgentLoginPath } from '../../shared/org-settings'
import { byRole, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import { agentItem } from '../account/sign-in-test-kit'
import { bodiesOf } from '../workspace/kept-test-kit'
import {
  gatewayLogin,
  noLogin,
  openAgentsTab,
  org,
  serveOrgLogins,
  words,
} from './agents-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const path = orgAgentLoginPath(org, 'claude')
const notSaved = 'Not saved. The request failed. Try again.'

/**
 * What the switch of the Claude login shows: its value, and whether it
 * takes a change.
 */
function shown() {
  const control = byRole('switch', 'Claude Use for every member')
  return {
    on: control.getAttribute('aria-checked') === 'true',
    locked: control.getAttribute('aria-disabled') === 'true',
  }
}

describe('the switch "Use for every member" of an org login', () => {
  test('a change shows at once, saves the new value, and keeps it with its hint', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    serveOrgLogins(server, [gatewayLogin('claude'), noLogin('codex')])
    server.json('PATCH', path, gatewayLogin('claude', undefined, true))
    held.holdAnswer('PATCH', path)
    const { view } = await openAgentsTab(server, { fetch: held.fetch })
    const before = shown()
    const from = server.requests.length
    await press(byRole('switch', 'Claude Use for every member'))
    const saving = shown()
    held.release('PATCH', path)
    await waitFor(() => !shown().locked, 'the saved switch')
    expect({
      before,
      saving,
      sent: await bodiesOf(server, 'PATCH', path, from),
      after: shown(),
      claude: agentItem(view, 'claude'),
    }).toEqual({
      before: { on: false, locked: false },
      saving: { on: true, locked: true },
      sent: [{ useForEveryMember: true }],
      after: { on: true, locked: false },
      claude: `Claude Connected Replace Remove Own endpoint at llm.acme.example.com ${words.on}`,
    })
  })

  test('a change that the app did not save shows its cause and the saved value, until a later change saves', async () => {
    const server = new FakeApiServer()
    serveOrgLogins(server, [gatewayLogin('claude'), noLogin('codex')])
    const failure = {
      code: 'internal_error',
      message: 'The request failed. Try again.',
    }
    server.json('PATCH', path, { error: failure }, 500)
    const { view } = await openAgentsTab(server)
    await press(byRole('switch', 'Claude Use for every member'))
    await waitFor(() => !shown().locked, 'the end of the failed save')
    const failed = { switch: shown(), claude: agentItem(view, 'claude') }
    server.json('PATCH', path, gatewayLogin('claude', undefined, true))
    await press(byRole('switch', 'Claude Use for every member'))
    await waitFor(() => !shown().locked, 'the end of the save')
    expect({ failed, saved: shown(), cause: queryByText(notSaved) }).toEqual({
      failed: {
        switch: { on: false, locked: false },
        claude: `Claude Connected Replace Remove Own endpoint at llm.acme.example.com ${words.off} ${notSaved}`,
      },
      saved: { on: true, locked: false },
      cause: null,
    })
  })
})
