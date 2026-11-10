import { expect, it } from 'vitest'

import { ACCOUNT_PATHS, agentLoginPath } from '../../shared/account'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { readAccount, readLogin } from '../api/read-core'
import { accountRoutes } from './account-routes'
import { createBackend } from './backend'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { seedState } from './seed'

function setup(search = '?login=none') {
  const server = new FakeApiServer()
  const backend = createBackend(
    seedState(readDevOptions(search)),
    new FakeWorkspaceEvents([]),
    () => FAKE_TIME,
    () => 'unused',
  )
  const fetch = routeFetch(accountRoutes(backend), () => {}, server.fetch)
  return { backend, fetch }
}

it('saves only endpoint metadata with shared defaults and keeps the share choice on rotation', async () => {
  const { fetch, backend } = setup()
  for (const agent of ['claude', 'codex'] as const) {
    const path = agentLoginPath(agent)
    const save = () =>
      fetch(path, {
        method: 'PUT',
        body: JSON.stringify({
          agent,
          kind: 'endpoint',
          secret: 'private-key',
          endpoint:
            ' https://user:password@proxy.example.test:8443/private/v1?key=value#part ',
        }),
      })
    const saved = await save()
    expect(saved.status).toBe(200)
    const metadata = {
      agent,
      connected: true,
      kind: 'endpoint',
      host: 'proxy.example.test:8443',
      noReuse: false,
      updatedAt: FAKE_TIME,
    }
    expect(readLogin(await saved.json())).toEqual(metadata)
    await fetch(path, {
      method: 'PATCH',
      body: JSON.stringify({ noReuse: true }),
    })
    expect(readLogin(await (await save()).json())).toEqual({
      ...metadata,
      noReuse: true,
    })
    const direct = await fetch(path, {
      method: 'PUT',
      body: JSON.stringify({ agent, kind: 'api-key', secret: 'direct-key' }),
    })
    expect(readLogin(await direct.json())).toEqual({
      agent,
      connected: true,
      kind: 'api-key',
      noReuse: false,
      updatedAt: FAKE_TIME,
    })
    expect(readLogin(await (await save()).json())).toEqual(metadata)
  }
  const account = await fetch(ACCOUNT_PATHS.account)
  const body = await account.text()
  expect(readAccount(JSON.parse(body)).agentLogins).toEqual(
    backend.state.account.agentLogins,
  )
  expect(JSON.stringify(backend.state)).not.toMatch(
    /private-key|password|private\/v1|key=value/,
  )
})

it('refuses unsafe dev endpoint saves and seeds connected own endpoint statuses', async () => {
  const { fetch } = setup('?login=endpoint')
  expect(
    readAccount(await (await fetch(ACCOUNT_PATHS.account)).json()).agentLogins,
  ).toEqual([
    {
      agent: 'claude',
      connected: true,
      kind: 'endpoint',
      host: 'proxy.example.test',
      noReuse: false,
      updatedAt: FAKE_TIME,
    },
    {
      agent: 'codex',
      connected: true,
      kind: 'endpoint',
      host: 'proxy.example.test',
      noReuse: false,
      updatedAt: FAKE_TIME,
    },
  ])
  const refused = await fetch(agentLoginPath('claude'), {
    method: 'PUT',
    body: JSON.stringify({
      agent: 'claude',
      kind: 'endpoint',
      endpoint: 'http://proxy.example.test',
      secret: 'private-key',
    }),
  })
  expect(refused.status).toBe(400)
  expect(await refused.json()).toEqual({
    error: {
      code: 'invalid_endpoint',
      message:
        'Use an https:// address. Only localhost, 127.0.0.1, and [::1] can use http://.',
    },
  })
})
