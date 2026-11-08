import type { AppDependencies, AppEnv } from '../env'
import { workspaceBinding } from '../app-api/workspace-state'
import { runnerSoftware } from '../configuration'
import { imageRuntime } from '../lifecycle/runtime'
import { refreshImagesForPush } from '../lifecycle/image-timers'
import { handleGitHubWebhook } from './webhook'
import { installedRepository } from './composition-data'
import { requireFeatureResult } from '../features/result'

export function productionGitHubWebhook(
  request: Request,
  env: AppEnv,
  dependencies: AppDependencies,
) {
  return handleGitHubWebhook(
    request,
    {
      DB: env.DB,
      MACHINE_ORIGIN: env.MACHINE_ORIGIN ?? '',
      GITHUB_WEBHOOK_SECRET: env.GITHUB_WEBHOOK_SECRET ?? '',
    },
    {
      now: dependencies.now,
      refresh: async (workspace, signal) =>
        requireFeatureResult(
          await workspaceBinding(env)
            .getByName(workspace.id)
            .refreshGitHub(workspace, signal),
        ),
      pushed: async (repositoryId, installationId, branch) => {
        if (!(await installedRepository(env.DB, repositoryId, installationId)))
          return
        await refreshImagesForPush(imageRuntime(env, dependencies), {
          githubRepositoryId: repositoryId,
          installationId,
          ref: `refs/heads/${branch}`,
          software: runnerSoftware(env),
        })
      },
    },
  )
}
