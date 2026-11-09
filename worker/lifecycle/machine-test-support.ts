import type { WebSocket } from 'miniflare'

import type { User } from '../../src/shared/api'
import { sessionsPath, sessionPaths } from '../../src/shared/sessions'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { CLAUDE } from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import {
  requestRunner,
  OuterFakeRunner,
} from '../chat/integration/runner-socket.test-support'
import { createLifecycleChatFixture } from '../chat/integration/workspace-lifecycle.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { agentLoginContext } from '../chat/queries'
import { encrypt } from '../security/crypto'
import { readWorkspace, workspaceView } from './workspace-data'
import type { WorkspaceRuntime } from './workspace-runtime'
import type { LifecycleEnvironment } from './runtime'
import { workspaceLifecycleEndpoint } from './workspace-transport'

interface RunningMachineTurn {
  sessionId: string
  turnId: string
  messageId: string
}

export async function machineCredentialFixture(bundle: string) {
  const active = await createLifecycleChatFixture(bundle)
  const { WORKSPACES } =
    await active.runtime.getBindings<Pick<LifecycleEnvironment, 'WORKSPACES'>>()
  const user = { ...active.first.sender }
  const sockets: WebSocket[] = []
  let runner: OuterFakeRunner | undefined
  const runtime: WorkspaceRuntime = {
    env: { ...active.env, WORKSPACES },
    dependencies: {
      now: Date.now,
      randomToken: () => 'machine-test-token',
      fetch: active.github.fetch,
    },
    workspace: (id) => {
      if (id !== OUTER_WORKSPACE) throw new Error('Unexpected workspace.')
      return workspaceLifecycleEndpoint(active.actor(), active.env)
    },
  }
  const nextTurn = async (): Promise<RunningMachineTurn> => {
    if (!runner) throw new Error('The runner is missing.')
    const command = record(await runner.inbox.next())
    if (command.type !== 'turn') throw new Error('Expected a running turn.')
    return {
      sessionId: string(command.sessionId),
      turnId: string(command.turnId),
      messageId: string(record(command.message).id),
    }
  }
  const send = async (sessionId: string, messageId: string) => {
    const response = await active.request(
      sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, sessionId),
      {
        method: 'POST',
        body: JSON.stringify({
          id: messageId,
          text: 'Start the next turn',
          choice: CLAUDE,
          attachmentIds: [],
        }),
      },
    )
    if (response.status !== 202) throw new Error('The message was refused.')
    return nextTurn()
  }
  return {
    runtime,
    org: { id: OUTER_ORG },
    user,
    async create(sender: User = user) {
      active.first.sender = sender
      await active.env.DB.prepare(
        'UPDATE workspace_runtime SET created_by_user_id = ? WHERE workspace_id = ?',
      )
        .bind(sender.id, OUTER_WORKSPACE)
        .run()
      if (sender.id !== user.id)
        await active.env.DB.prepare(
          `INSERT INTO agent_logins (user_id, agent, kind, ciphertext, created_at, updated_at)
          VALUES (?, 'claude', 'api-key', ?, 1, 1)`,
        )
          .bind(
            sender.id,
            await encrypt(
              'sender-agent-login',
              agentLoginContext(sender.id, 'claude'),
              active.env.BOAT_KEY_ENCRYPTION_KEY,
            ),
          )
          .run()
      await active.initialize()
      await active.actor().beginLifecycleStart('create')
      await active.actor().lifecyclePrepared()
      const connection = await requestRunner(active)
      if (!connection.webSocket)
        throw new Error('The runner socket is missing.')
      sockets.push(connection.webSocket)
      runner = new OuterFakeRunner(connection.webSocket)
      if (record(await runner.inbox.next()).type !== 'welcome')
        throw new Error('The runner welcome is missing.')
      runner.emit({ type: 'runner.ready' })
      if (record(await runner.inbox.next()).type !== 'confirm')
        throw new Error('The readiness confirm is missing.')
      await nextTurn()
      return {
        workspace: workspaceView(
          await readWorkspace(active.env.DB, OUTER_ORG, OUTER_WORKSPACE),
          active.env.APP_ORIGIN,
        ),
        first: active.first,
      }
    },
    async session() {
      const response = await active.request(
        sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
        {
          method: 'POST',
          body: JSON.stringify({ choice: CLAUDE }),
        },
      )
      if (response.status !== 201) throw new Error('The session was refused.')
      return string(record(record(await response.json()).session).id)
    },
    send,
    async finish(turn: RunningMachineTurn) {
      if (!runner) throw new Error('The runner is missing.')
      runner.emit({
        type: 'turn.completed',
        sessionId: turn.sessionId,
        turnId: turn.turnId,
        state: 'finished',
        durationMs: 10,
        files: [],
        omittedFileCount: 0,
        userMessageIds: [turn.messageId],
      })
      if (record(await runner.inbox.next()).type !== 'confirm')
        throw new Error('The turn-end confirm is missing.')
      await active.actor().readLifecycle()
    },
    async dispose() {
      await closeSockets(...sockets)
      await active.dispose()
    },
  }
}
