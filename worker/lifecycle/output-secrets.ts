import type { AppEnv } from '../env'
import { environmentSecrets } from './org-environment'
import { workspaceEnvironmentSettings } from './settings-data'
import { runningEnvironment } from './start-environment'

/** Settings edits do not replace the values held by the running computer. */
export async function runningOutputSecrets(
  env: AppEnv,
  workspace: { id: string; orgId: string },
): Promise<string[]> {
  const capture = await runningEnvironment(env.DB, workspace.id)
  return environmentSecrets(
    await workspaceEnvironmentSettings(env, workspace.orgId, capture),
  )
}
