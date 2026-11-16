import { expect, it } from 'vitest'

import { terminalPaths } from '../../src/shared/terminal'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { record } from '../chat/inputs'
import {
  addTerminal,
  setupTerminalListTests,
  terminalListPath,
  terminalPath,
  terminalStatePath,
} from './terminal-list.test-support'

const suite = setupTerminalListTests()

it('gates terminal writes for suspended owners, suspended orgs, stopped workspaces, and older software', async () => {
  const active = await suite.create()
  const second = await addTerminal(active)
  const cases = [
    {
      sql: "UPDATE users SET suspended_at = 1 WHERE id = 'owner'",
      reset: "UPDATE users SET suspended_at = NULL WHERE id = 'owner'",
      status: 403,
      code: 'user_suspended',
    },
    {
      sql: "UPDATE orgs SET suspended_at = 1 WHERE id = 'chat-org'",
      reset: "UPDATE orgs SET suspended_at = NULL WHERE id = 'chat-org'",
      status: 403,
      code: 'org_suspended',
    },
    {
      sql: "UPDATE workspaces SET state = 'stopped'",
      reset: "UPDATE workspaces SET state = 'ready'",
      status: 409,
      code: 'sandbox_not_ready',
    },
  ]
  for (const scenario of cases) {
    await active.env.DB.prepare(scenario.sql).run()
    for (const [path, method] of [
      [terminalListPath, 'POST'],
      [terminalPath(second.id), 'DELETE'],
      [
        terminalPaths.terminalSocket(OUTER_ORG, OUTER_WORKSPACE, second.id),
        'GET',
      ],
    ]) {
      const response = await active.request(path, {
        method,
        ...(method === 'GET' ? {} : { body: '{}' }),
        headers: {
          Cookie: active.cookies.memberCookie,
          ...(method === 'GET'
            ? { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': 'tty' }
            : {}),
        },
      })
      expect(response.status, scenario.code).toBe(scenario.status)
      expect(await response.json()).toMatchObject({
        error: { code: scenario.code },
      })
    }
    const state = await active.request(terminalStatePath, {
      headers: { Cookie: active.cookies.memberCookie },
    })
    expect(state.status).toBe(200)
    expect(record(await state.json()).terminals).toContainEqual(second)
    await active.env.DB.prepare(scenario.reset).run()
  }
  await active.env.DB.prepare(
    'UPDATE terminal_credentials SET several = 0',
  ).run()
  const unavailable = await active.request(terminalListPath, {
    method: 'POST',
    body: '{}',
  })
  expect(unavailable.status).toBe(409)
  expect(await unavailable.json()).toMatchObject({
    error: { code: 'terminals_unavailable' },
  })
  expect(
    record(await (await active.request(terminalStatePath)).json()).several,
  ).toBe(false)
  expect(active.boat.commands).toEqual([])
  expect(await active.actor().readChatWorkspaceSummary()).toMatchObject({
    throughEventNumber: 1,
  })
})

it('forwards terminal socket paths to the workspace gate, including invalid IDs', async () => {
  const active = await suite.create()
  for (const id of ['f'.repeat(32), 'INVALID', 'workspace/other', '%']) {
    const response = await active.request(
      terminalPaths.terminalSocket(OUTER_ORG, OUTER_WORKSPACE, id),
      {
        headers: { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': 'tty' },
      },
    )
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: 'terminal_not_found' },
    })
  }
  const protocol = await active.request(
    terminalPaths.terminalSocket(OUTER_ORG, OUTER_WORKSPACE, 'workspace'),
  )
  expect(protocol.status).toBe(400)
  expect(await protocol.json()).toMatchObject({
    error: { code: 'terminal_protocol' },
  })
  expect(active.boat.commands).toEqual([])
})

it('rejects cross-site or originless terminal writes and keeps access scoped to the signed-in member', async () => {
  const active = await suite.create()
  const second = await addTerminal(active)
  for (const [path, method] of [
    [terminalListPath, 'POST'],
    [terminalPath(second.id), 'DELETE'],
  ]) {
    for (const origin of [null, 'https://untrusted.example']) {
      const headers = new Headers(active.headers)
      if (origin === null) headers.delete('Origin')
      else headers.set('Origin', origin)
      const response = await active.runtime.dispatchFetch(
        `${active.env.APP_ORIGIN}${path}`,
        { method, headers: [...headers.entries()], body: '{}' },
      )
      expect(response.status).toBe(403)
      expect(await response.json()).toMatchObject({
        error: { code: 'origin_forbidden' },
      })
      const direct = await active.request(
        `/__test/features?workspace=${encodeURIComponent(OUTER_WORKSPACE)}`,
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'terminal-request',
            path,
            method,
            origin,
          }),
        },
      )
      expect(direct.status).toBe(403)
      expect(await direct.json()).toMatchObject({
        error: { code: 'origin_forbidden' },
      })
    }
  }
  const headers = new Headers(active.headers)
  headers.delete('Origin')
  expect(
    (
      await active.runtime.dispatchFetch(
        `${active.env.APP_ORIGIN}${terminalStatePath}`,
        { headers: [...headers.entries()] },
      )
    ).status,
  ).toBe(200)
  await active.env.DB.prepare(
    "DELETE FROM org_members WHERE user_id = 'member'",
  ).run()
  const forbidden = await active.request(terminalListPath, {
    method: 'POST',
    body: '{}',
    headers: { Cookie: active.cookies.memberCookie },
  })
  expect(forbidden.status).toBe(404)
  expect(await forbidden.json()).toMatchObject({
    error: { code: 'org_not_found' },
  })
  expect(active.boat.commands).toEqual([])
})
