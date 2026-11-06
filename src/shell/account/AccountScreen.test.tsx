import { describe, expect, test } from 'vitest'
import { ACCOUNT_PATHS } from '../../shared/account'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_TIME,
  fakeUser,
} from '../../test-support/fixtures/core'
import { renderScreen, startedApp, textOf } from '../test-render'
import { AccountScreen } from './AccountScreen'
import { buttonsOf, listItems } from './test-markup'

describe('AccountScreen', () => {
  test('a connect link opens the Codex form, and a connected Claude login shows its kind and Remove', async () => {
    const server = new FakeApiServer()
    server.json('GET', ACCOUNT_PATHS.account, {
      ...coreFixtures().account,
      agentLogins: [
        {
          agent: 'claude',
          connected: true,
          kind: 'token',
          updatedAt: FAKE_TIME,
        },
        { agent: 'codex', connected: false },
      ],
    })
    const app = await startedApp(server)
    const html = renderScreen(
      app,
      <AccountScreen connect="codex" user={fakeUser} />,
    )
    const [claude, codex] = listItems(html, 'Agents')
    expect(textOf(claude)).toBe('Claude Connected Subscription token Remove')
    expect(buttonsOf(claude)).toEqual([
      { label: 'Remove Claude', disabled: false },
    ])
    expect(textOf(codex)).toContain('OpenAI API key')
    expect(codex).toContain('type="password"')
    expect(buttonsOf(codex)).toEqual([
      { label: 'Cancel', disabled: false },
      { label: 'Connect', disabled: false },
    ])
  })
})
