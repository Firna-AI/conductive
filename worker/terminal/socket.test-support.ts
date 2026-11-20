import { afterAll, beforeAll, beforeEach } from 'vitest'

import {
  terminalPaths,
  type CreateTerminalResponse,
} from '../../src/shared/terminal'
import { createChatFixture, WORKSPACE_ID } from '../chat/harness.test-support'
import { createToolsHarness, type ToolsHarness } from '../previews/test-support'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { TEST_TIME } from '../test-support/harness'
import { cacheTerminalPassword } from './credentials'
import { createTerminalHandler } from './handler'
import { WorkspaceTerminals } from './workspace'

export function setupTerminalSocketTests() {
  let harness: ToolsHarness
  beforeAll(async () => {
    harness = await createToolsHarness()
  })
  beforeEach(async () => {
    await harness.resetTools()
  })
  afterAll(async () => {
    await harness.dispose()
  })
  return async (several = true) => {
    const fixture = await createChatFixture(harness)
    const orgId = fixture.org.id
    const workspaceId = WORKSPACE_ID
    await harness.env.DB.prepare(
      "UPDATE workspaces SET sandbox_id = 'bx_one', state = 'ready', provider_account = ? WHERE id = ?",
    )
      .bind(DEFAULT_PROVIDER_ACCOUNT, workspaceId)
      .run()
    await cacheTerminalPassword(
      harness.env,
      {
        orgId,
        workspaceId,
        sandboxId: 'bx_one',
        providerAccount: DEFAULT_PROVIDER_ACCOUNT,
        state: 'ready',
      },
      'a'.repeat(64),
      TEST_TIME,
      several,
    )
    const owner = new WorkspaceTerminals(fixture.chat)
    const handler = createTerminalHandler(
      harness.env,
      harness.dependencies,
      owner,
    )
    const fetch = (path: string, method = 'GET') =>
      handler.fetch(
        fixture.request(
          path,
          method === 'GET' ? undefined : {},
          undefined,
          method,
        ),
      )
    const socketPath = (id: string) =>
      terminalPaths.terminalSocket(orgId, workspaceId, id)
    const socket = (path: string) =>
      handler.fetch(
        new Request(fixture.request(path), {
          headers: {
            ...Object.fromEntries(fixture.request(path).headers),
            Upgrade: 'websocket',
            'Sec-WebSocket-Protocol': 'tty',
            Authorization: 'browser-secret',
            'X-Browser-Secret': 'private',
          },
        }),
      )
    const create = async () => {
      const response = await fetch(
        terminalPaths.terminals(orgId, workspaceId),
        'POST',
      )
      if (response.status !== 201)
        throw new Error(
          `Terminal create returned ${response.status}: ${await response.text()}`,
        )
      const result: CreateTerminalResponse = await response.json()
      return result.terminal
    }
    const close = (id: string) =>
      fetch(terminalPaths.terminal(orgId, workspaceId, id), 'DELETE')
    const disconnect = async () => {
      harness.serverSockets.at(-1)!.close(1000, 'finished')
      await harness.upstreamSockets.at(-1)!.end
    }
    return {
      ...fixture,
      harness,
      owner,
      handler,
      fetch,
      socketPath,
      socket,
      create,
      close,
      disconnect,
      orgId,
      workspaceId,
    }
  }
}
