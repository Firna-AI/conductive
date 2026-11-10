import type { AppDependencies, AppEnv } from '../env'
import { workspaceBinding } from '../app-api/workspace-state'
import { runnerSoftware } from '../configuration'
import { imageRuntime } from '../lifecycle/runtime'
import { refreshImagesForPush } from '../lifecycle/image-timers'
import { handleGitHubWebhook } from './webhook'
import { installedRepository } from './composition-data'
import { requireFeatureResult } from '../features/result'
import { dispatchPullRequestRuns } from '../routines/pull-request-dispatch'
import { routineRunRuntime } from '../routines/run-runtime'
import { warnWorker } from '../warnings'

export async function productionGitHubWebhook(
  request: Request,
  env: AppEnv,
  dependencies: AppDependencies,
  execution?: Pick<ExecutionContext, 'waitUntil'>,
) {
  const background: (() => Promise<void>)[] = []
  const response = await handleGitHubWebhook(
    request,
    {
      DB: env.DB,
      MACHINE_ORIGIN: env.MACHINE_ORIGIN ?? '',
      GITHUB_WEBHOOK_SECRET: env.GITHUB_WEBHOOK_SECRET ?? '',
    },
    {
      now: dependencies.now,
      pullRequest: (event, deliveryId) =>
        dispatchPullRequestRuns(
          routineRunRuntime(env, dependencies),
          event,
          deliveryId,
          (work) => background.push(work),
        ),
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
  if (execution && background.length)
    execution.waitUntil(
      Promise.all(
        background.map(async (work) => {
          try {
            await work()
          } catch {
            warnWorker('A pull request run could not start in the background.')
          }
        }),
      ),
    )
  return response
}
