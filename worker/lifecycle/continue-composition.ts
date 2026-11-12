import type { AppDependencies, AppEnv } from '../env'
import type { WorkspaceGitHub } from '../features/github'
import type { createWorkspaceIntegration } from '../chat/workspace-integration'
import { assertReceiverActive } from '../members/receiver-fence'
import { WorkspaceContinue } from './continue'
import type { ContinueOptions } from './continue-types'
import { resumeWorkspace } from './workspace-resume'
import { workspaceRuntime } from './runtime'

export function createWorkspaceContinue(input: {
  env: AppEnv
  dependencies: AppDependencies
  integration: Pick<
    ReturnType<typeof createWorkspaceIntegration>,
    'storage' | 'chat' | 'controller' | 'alarms'
  >
  github: Pick<WorkspaceGitHub, 'refresh' | 'defaultBranch' | 'scheduleFresh'>
  matches(workspaceId: string): boolean
  run: ContinueOptions['run']
}): WorkspaceContinue {
  const { env, dependencies, integration, github } = input
  return new WorkspaceContinue({
    matches: input.matches,
    assertActive: () => assertReceiverActive(integration.storage),
    activity: async () => {
      await integration.controller.lifecycleActivity()
    },
    env,
    dependencies,
    storage: integration.storage,
    chat: integration.chat,
    run: input.run,
    schedule: (at) => integration.alarms.set('continue', at),
    refresh: (workspace, signal) => github.refresh(workspace, signal),
    defaultBranch: (workspace, userId) =>
      github.defaultBranch(workspace, userId),
    scheduleRefresh: (workspace) => github.scheduleFresh(workspace),
    resume: async (orgId, id, userId) => {
      await resumeWorkspace(
        workspaceRuntime(env, dependencies),
        orgId,
        id,
        userId,
      )
    },
  })
}
