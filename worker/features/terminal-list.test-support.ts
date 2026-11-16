import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll } from 'vitest'

import { terminalPaths } from '../../src/shared/terminal'
import { workspaceEventsPath } from '../../src/shared/events'
import { closeSockets, SocketInbox } from '../chat/adapter-sockets.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { number, record, string } from '../chat/inputs'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { cacheTerminalPassword } from '../terminal/credentials'
import { featureFixture, type FeatureFixture } from './fixture.test-support'

export const terminalStatePath = terminalPaths.connection(
  OUTER_ORG,
  OUTER_WORKSPACE,
)
export const terminalListPath = terminalPaths.terminals(
  OUTER_ORG,
  OUTER_WORKSPACE,
)
export const terminalPath = (id: string) =>
  terminalPaths.terminal(OUTER_ORG, OUTER_WORKSPACE, id)

function terminalEntry(value: unknown) {
  const entry = record(value)
  return {
    id: string(entry.id),
    number: number(entry.number),
    socketPath: string(entry.socketPath),
  }
}

export async function addTerminal(active: FeatureFixture) {
  const response = await active.request(terminalListPath, {
    method: 'POST',
    body: '{}',
  })
  if (response.status !== 201)
    throw new Error(
      `Terminal create returned ${response.status}: ${await response.text()}`,
    )
  return terminalEntry(record(await response.json()).terminal)
}

export function setupTerminalListTests() {
  let bundle: string
  const fixtures: FeatureFixture[] = []
  const sockets: WebSocket[] = []
  beforeAll(async () => {
    bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
  })
  afterEach(async () => {
    await closeSockets(...sockets)
    sockets.length = 0
    await Promise.all(fixtures.splice(0).map((fixture) => fixture.dispose()))
  })
  return {
    create: async () => {
      const active = await featureFixture(bundle)
      fixtures.push(active)
      await active.env.DB.prepare(
        "UPDATE workspaces SET sandbox_id = 'bx_terminals' WHERE id = ?",
      )
        .bind(OUTER_WORKSPACE)
        .run()
      await cacheTerminalPassword(
        active.env,
        {
          orgId: OUTER_ORG,
          workspaceId: OUTER_WORKSPACE,
          sandboxId: 'bx_terminals',
          providerAccount: DEFAULT_PROVIDER_ACCOUNT,
          state: 'ready',
        },
        'a'.repeat(64),
        1,
        true,
      )
      return active
    },
    tab: async (active: FeatureFixture, after = 0) => {
      const response = await active.request(
        workspaceEventsPath(OUTER_ORG, OUTER_WORKSPACE, after),
        { headers: { Upgrade: 'websocket' } },
      )
      if (!response.webSocket) throw new Error('Missing workspace socket')
      sockets.push(response.webSocket)
      const inbox = new SocketInbox(response.webSocket)
      response.webSocket.accept()
      return { inbox, history: await inbox.next() }
    },
  }
}
