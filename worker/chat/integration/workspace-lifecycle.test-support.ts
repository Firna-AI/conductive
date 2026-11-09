import { mkdir, mkdtemp } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { Workspace } from '../../workspace'
import type { FirstWorkspaceMessage } from '../../lifecycle/workspace-runtime'
import { CLAUDE } from '../harness.test-support'
import { createOuterRuntime } from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'

export async function createLifecycleChatFixture(bundle: string) {
  const directory = resolve(
    '.context/boat-native-remote-workspaces/8i/completion/runtime',
  )
  await mkdir(directory, { recursive: true })
  const fixture = await createOuterRuntime(bundle, {
    persistencePath: await mkdtemp(`${directory}/case-`),
  })
  await fixture.env.DB.batch([
    fixture.env.DB.prepare(
      `INSERT INTO workspace_runtime
      (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id)
      VALUES (?, ?, 'owner', 'first-session', 'first-turn', 'claude', 'test-claude', 'high', 'first-message')`,
    ).bind(OUTER_WORKSPACE, OUTER_ORG),
    fixture.env.DB.prepare(
      "UPDATE workspaces SET sandbox_id = ?, name = '' WHERE id = ?",
    ).bind('bx_lifecycle', OUTER_WORKSPACE),
  ])
  fixture.boat.states.set('bx_lifecycle', 'ready')
  let bindings = await fixture.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  const actor = () => bindings.WORKSPACES.getByName(OUTER_WORKSPACE)
  const first: FirstWorkspaceMessage = {
    workspaceId: OUTER_WORKSPACE,
    sessionId: 'first-session',
    turnId: 'first-turn',
    sender: {
      id: 'owner',
      githubId: 101,
      githubLogin: 'owner',
      displayName: null,
      avatarUrl: null,
    },
    request: {
      id: 'first-message',
      text: 'Keep the first message',
      choice: CLAUDE,
      attachmentIds: [],
    },
  }
  const initialize = () =>
    actor().initializeLifecycle({
      workspaceId: first.workspaceId,
      orgId: OUTER_ORG,
      firstMessage: first.request,
      firstTurn: {
        sessionId: first.sessionId,
        turnId: first.turnId,
        senderUserId: first.sender.id,
      },
    })
  return {
    ...fixture,
    get runtime() {
      return fixture.runtime
    },
    actor,
    first,
    initialize,
    restart: async () => {
      await fixture.restart()
      bindings = await fixture.runtime.getBindings<{
        WORKSPACES: DurableObjectNamespace<Workspace>
      }>()
    },
  }
}
