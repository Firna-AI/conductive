import { describe, expect, test } from 'vitest'
import { ACCOUNT_PATHS } from '../../shared/account'
import { API_PATHS } from '../../shared/api'
import { GET_STARTED_PATH } from '../../shared/onboarding'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, fakeUser } from '../../test-support/fixtures/core'
import { buttonsOf } from '../account/test-markup'
import { renderScreen, startedApp } from '../test-render'
import { GetStartedScreen } from './GetStartedScreen'

/** A user who installed the GitHub App, and has no org and no agent yet. */
function installedServer(): FakeApiServer {
  const server = new FakeApiServer()
  server.json('GET', GET_STARTED_PATH, {
    orgId: null,
    steps: [
      { step: 'github-app', complete: true },
      { step: 'org', complete: false },
      { step: 'boat-key', complete: false },
      { step: 'agent-login', complete: false },
    ],
  })
  server.json('GET', API_PATHS.orgs, { orgs: [] })
  server.json('GET', ACCOUNT_PATHS.account, {
    ...coreFixtures().account,
    agentLogins: [
      { agent: 'claude', connected: false },
      { agent: 'codex', connected: false },
    ],
  })
  return server
}

describe('GetStartedScreen', () => {
  test('draws the four steps in order, and with the org next no later step opens its form', async () => {
    const app = await startedApp(installedServer())
    await app.account.loadInstallations()
    const html = renderScreen(app, <GetStartedScreen user={fakeUser} />)
    const titles = [...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map(
      ([, title]) => title,
    )
    expect(titles).toEqual([
      '1. Install the GitHub App',
      '2. Create your first org',
      '3. Add your Boat key',
      '4. Connect Claude or Codex',
    ])
    expect(buttonsOf(html)).toEqual([
      { label: 'Add another account', disabled: false },
      { label: 'Create org', disabled: false },
      { label: 'Copy the actions', disabled: false },
      { label: 'Connect Claude', disabled: false },
      { label: 'Connect Codex', disabled: false },
    ])
    expect(html).not.toContain('<input')
  })
})
