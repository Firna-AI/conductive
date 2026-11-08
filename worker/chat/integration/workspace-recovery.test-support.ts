import type { WebSocket } from 'miniflare'

import { DEVICE_COMMAND_PATH } from '../../../src/shared/device'
import { TOOL_TURN_HEADER } from '../../../tools/context'
import { closeSockets } from '../adapter-sockets.test-support'
import { OUTER_MACHINE_ORIGIN } from './outer-runtime.test-support'
import { OUTER_TOKEN, OUTER_WORKSPACE } from './outer-seed.test-support'
import { requestRunner, OuterFakeRunner } from './runner-socket.test-support'
import { reviewWorkspaceFixture } from './workspace-review.test-support'
import type { Workspace } from './workspace-recovery-entry.test-support'

export const FIRST_TURN_END = {
  type: 'turn.completed',
  sessionId: 'first-session',
  turnId: 'first-turn',
  state: 'finished',
  durationMs: 1,
  files: [],
  omittedFileCount: 0,
  userMessageIds: ['first-message'],
} as const

export async function recoveryWorkspaceFixture(bundle: string) {
  const fixture = await reviewWorkspaceFixture(bundle)
  const sockets: WebSocket[] = []
  return {
    ...fixture,
    get runtime() {
      return fixture.runtime
    },
    actor: async () => {
      const bindings = await fixture.runtime.getBindings<{
        WORKSPACES: DurableObjectNamespace<Workspace>
      }>()
      return bindings.WORKSPACES.getByName(OUTER_WORKSPACE)
    },
    connect: async (streamId: string) => {
      const response = await requestRunner(fixture)
      if (!response.webSocket) throw new Error('The runner socket is missing.')
      sockets.push(response.webSocket)
      const runner = new OuterFakeRunner(response.webSocket, OUTER_WORKSPACE, {
        streamId,
      })
      return { runner, welcome: await runner.inbox.next() }
    },
    requestMacCommand: (requestId: string) =>
      fixture.runtime.dispatchFetch(
        `${OUTER_MACHINE_ORIGIN}${DEVICE_COMMAND_PATH}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OUTER_TOKEN}`,
            [TOOL_TURN_HEADER]: 'first-turn',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId,
            command: 'echo recovery',
            folder: '/Users/owner/project',
            reason: 'Check a local result',
          }),
        },
      ),
    restart: async () => {
      await closeSockets(fixture.runner.socket, ...sockets)
      sockets.length = 0
      await fixture.restart()
    },
    dispose: async () => {
      await closeSockets(...sockets)
      await fixture.dispose()
    },
  }
}

export type RecoveryWorkspaceFixture = Awaited<
  ReturnType<typeof recoveryWorkspaceFixture>
>
