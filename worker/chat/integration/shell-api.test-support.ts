import type { Workspace } from '../../workspace'
import type { OuterRuntime } from './outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_WORKSPACE,
} from './outer-seed.test-support'

export async function seedShellWorkspaceRuntime(fixture: OuterRuntime) {
  await fixture.env.DB.batch(
    [OUTER_WORKSPACE, OTHER_WORKSPACE].map((id) =>
      fixture.env.DB.prepare(
        `INSERT INTO workspace_runtime
         (workspace_id, org_id, created_by_user_id, session_id, first_turn_id,
          agent, model, effort, first_message_id)
         VALUES (?, ?, 'owner', ?, ?, 'claude', 'test-claude', 'high', ?)`,
      ).bind(id, OUTER_ORG, `session-${id}`, `turn-${id}`, `message-${id}`),
    ),
  )
  const bindings = await fixture.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  return (id: string = OUTER_WORKSPACE) => bindings.WORKSPACES.getByName(id)
}
