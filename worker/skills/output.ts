import { runnerOutputSecretValues } from '../chat/runner-output'
import type { ChatStore } from '../chat/store'
import type { AppEnv } from '../env'
import { readWorkspaceToken } from '../lifecycle/tokens'
import { workspaceTurnTokensIn } from '../model-gateway/token'
import { secretTextFilter } from '../secrets/output-values'

export function filterSkillText(
  env: AppEnv,
  store: ChatStore,
  workspace: { id: string; orgId: string },
  text: string,
): Promise<string> {
  return store.read(workspace.id, async (view) => {
    const [secrets, workspaceToken, turnTokens] = await Promise.all([
      runnerOutputSecretValues(env, view, workspace),
      readWorkspaceToken(env, workspace.id),
      workspaceTurnTokensIn(
        text,
        workspace.id,
        env.BOAT_KEY_ENCRYPTION_KEY,
        async (id) => (await view.turn(id))?.gateway,
      ),
    ])
    return secretTextFilter([...secrets, workspaceToken, ...turnTokens])(text)
  })
}
