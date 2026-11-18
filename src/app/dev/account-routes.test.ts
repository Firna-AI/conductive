import { expect, it } from 'vitest'

import {
  ACCOUNT_PATHS,
  agentLoginPath,
  refreshAgentLoginModelsPath,
} from '../../shared/account'
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
            ' https://proxy.example.test:8443/private/v1?key=value#part ',
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
  for (const endpoint of [
    'https://8.8.8.8',
    'https://[2606:4700:4700::1111]',
    'http://proxy.example.test',
  ]) {
    const refused = await fetch(agentLoginPath('claude'), {
      method: 'PUT',
      body: JSON.stringify({
        agent: 'claude',
        kind: 'endpoint',
        endpoint,
        secret: 'private-key',
      }),
    })
    expect(refused.status, endpoint).toBe(400)
    expect(await refused.json()).toEqual({
      error: {
        code: 'invalid_endpoint',
        message:
          'Use a public https:// address with a host name, without a user name or a password.',
      },
    })
  }
  for (const [modelList, host] of [
    ['v1-only', 'v1-only.example.test'],
    ['read-failed', 'no-models.example.test'],
  ] as const) {
    const seeded = setup(`?login=endpoint&modelList=${modelList}`)
    const account = readAccount(
      await (await seeded.fetch(ACCOUNT_PATHS.account)).json(),
    )
    expect(account.agentLogins).toMatchObject([{ host }, { host }])
  }
})

it('refreshes the dev endpoint list without changing other logins or the secret-save time', async () => {
  const { fetch } = setup('?login=endpoint')
  const refreshed = await fetch(refreshAgentLoginModelsPath('claude'), {
    method: 'POST',
  })
  expect(refreshed.status).toBe(200)
  expect(await refreshed.json()).toEqual({ modelListReadFailed: false })
  const account = readAccount(await (await fetch(ACCOUNT_PATHS.account)).json())
  expect(account.agentLogins[0]).toMatchObject({
    updatedAt: FAKE_TIME,
    modelList: { missing: [], checkedAt: FAKE_TIME },
  })
  expect(account.agentLogins[1]).not.toHaveProperty('modelList')
  expect(
    (
      await fetch(agentLoginPath('codex'), {
        method: 'PUT',
        body: JSON.stringify({
          agent: 'codex',
          kind: 'endpoint',
          endpoint: 'https://proxy.example.test/v1',
          secret: 'fake-key',
        }),
      })
    ).status,
  ).toBe(200)
  expect(
    readAccount(await (await fetch(ACCOUNT_PATHS.account)).json())
      .agentLogins[1],
  ).toMatchObject({ modelList: { missing: [], checkedAt: FAKE_TIME } })
})

it('returns save flags for the fake /v1-only and failed-list hosts without saving the flags', async () => {
  const { fetch } = setup()
  for (const [endpoint, flags] of [
    [
      'https://v1-only.example.test/private?key=private',
      { endpointV1Added: true, modelListReadFailed: false },
    ],
    [
      'https://v1-only.example.test/private/v1',
      { endpointV1Added: false, modelListReadFailed: false },
    ],
    [
      'https://no-models.example.test',
      { endpointV1Added: false, modelListReadFailed: true },
    ],
  ] as const) {
    const response = await fetch(agentLoginPath('codex'), {
      method: 'PUT',
      body: JSON.stringify({
        agent: 'codex',
        kind: 'endpoint',
        endpoint,
        secret: 'private-key',
      }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      agent: 'codex',
      connected: true,
      kind: 'endpoint',
      host: new URL(endpoint).host,
      noReuse: false,
      updatedAt: FAKE_TIME,
      ...flags,
    })
    const refreshed = await fetch(refreshAgentLoginModelsPath('codex'), {
      method: 'POST',
    })
    expect(refreshed.status).toBe(200)
    expect(await refreshed.json()).toEqual({
      modelListReadFailed: flags.modelListReadFailed,
    })
    const accountBody = await (await fetch(ACCOUNT_PATHS.account)).text()
    expect(accountBody).not.toMatch(/endpointV1Added|modelListReadFailed/)
    const account = readAccount(JSON.parse(accountBody))
    expect(account.agentLogins[1]).toEqual({
      agent: 'codex',
      connected: true,
      kind: 'endpoint',
      host: new URL(endpoint).host,
      noReuse: false,
      updatedAt: FAKE_TIME,
      ...(flags.modelListReadFailed
        ? {}
        : { modelList: { missing: [], checkedAt: FAKE_TIME } }),
    })
  }
})
