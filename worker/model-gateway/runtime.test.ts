import type { WebSocket } from 'miniflare'
import { expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { sessionPaths, sessionsPath } from '../../src/shared/sessions'
import { createAdapterRuntime } from '../chat/adapter-runtime.test-support'
import { closeSockets, SocketInbox } from '../chat/adapter-sockets.test-support'
import {
  CLAUDE,
  MACHINE_ORIGIN,
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
} from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import type { AppEnv } from '../env'
import { workspaceRuntime } from '../lifecycle/runtime'
import { TEST_ORIGIN } from '../test-support/harness'
import type { Workspace } from '../workspace'

it('checks a turn through the workspace runtime RPC after SQLite eviction', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/integration/gateway-entry.test-support.ts',
  )
  const sockets: WebSocket[] = []
  try {
    const created = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${sessionsPath('org', WORKSPACE_ID)}`,
      { method: 'POST', headers, body: JSON.stringify({ choice: CLAUDE }) },
    )
    expect(created.status).toBe(201)
    const sessionId = string(record(record(await created.json()).session).id)
    const accepted = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${sessionPaths.messages('org', WORKSPACE_ID, sessionId)}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: 'gateway-message',
          choice: CLAUDE,
          text: 'Check the code',
          attachmentIds: [],
        }),
      },
    )
    expect(accepted.status).toBe(202)
    const response = await runtime.dispatchFetch(
      `${MACHINE_ORIGIN}${MACHINE_PATHS.runner}`,
      {
        headers: {
          Upgrade: 'websocket',
          Authorization: `Bearer ${WORKSPACE_TOKEN}`,
        },
      },
    )
    expect(response.status).toBe(101)
    const runner = response.webSocket
    if (!runner) throw new Error('The runner socket is missing.')
    sockets.push(runner)
    const inbox = new SocketInbox(runner)
    runner.accept()
    runner.send(
      JSON.stringify({
        type: 'hello',
        protocolVersion: 1,
        workspaceId: WORKSPACE_ID,
        streamId: 'gateway-stream',
      }),
    )
    expect(await inbox.next()).toMatchObject({ type: 'welcome' })
    runner.send(
      JSON.stringify({
        type: 'event',
        streamId: 'gateway-stream',
        eventNumber: 1,
        occurredAt: 1,
        event: { type: 'runner.ready' },
      }),
    )
    expect(await inbox.next()).toMatchObject({ type: 'confirm' })
    const turnId = string(record(await inbox.next()).turnId)
    const issue = async () => {
      const response = await runtime.dispatchFetch(
        `${TEST_ORIGIN}/issue?turnId=${encodeURIComponent(turnId)}`,
      )
      expect(response.status).toBe(200)
      return string(record(await response.json()).token)
    }
    const token = await issue()
    await closeSockets(...sockets)
    await runtime.unsafeEvictDurableObject('chat-adapter-tests', 'Workspace', {
      name: WORKSPACE_ID,
    })
    expect(await issue()).toBe(token)
    const bindings = await runtime.getBindings<{
      WORKSPACES: DurableObjectNamespace<Workspace>
      DB: D1Database
    }>()
    const env: AppEnv = {
      ...bindings,
      APP_ORIGIN: TEST_ORIGIN,
      MACHINE_ORIGIN,
      BOAT_KEY_ENCRYPTION_KEY: btoa('e'.repeat(32)),
      BOAT_ORG_ID: 'unused',
      BOAT_API_KEY: 'unused',
      SESSION_SIGNING_KEY: 'unused',
      GITHUB_CLIENT_ID: 'unused',
      GITHUB_CLIENT_SECRET: 'unused',
    }
    const endpoint = workspaceRuntime(env).workspace(WORKSPACE_ID)
    const check = async () => {
      const result = await endpoint.checkTurnToken(token)
      if (!result.ok) return { ok: result.ok, reason: result.reason }
      const { agent, kind, secret } = result.login
      return { ok: result.ok, login: { agent, kind, secret } }
    }
    expect(await check()).toEqual({
      ok: true,
      login: { agent: 'claude', kind: 'api-key', secret: 'adapter-secret' },
    })
    await bindings.DB.prepare(
      "UPDATE agent_logins SET updated_at = 2 WHERE user_id = 'owner' AND agent = 'claude'",
    ).run()
    expect(await check()).toEqual({
      ok: false,
      reason: 'agent_login_changed',
    })
    expect(await check()).toEqual({
      ok: false,
      reason: 'turn_not_active',
    })
  } finally {
    await closeSockets(...sockets)
    await runtime.dispose()
  }
})
