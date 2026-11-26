import type { AppDependencies, AppEnv } from '../env'
import { workspaceBinding } from '../app-api/workspace-state'
import { latestSoftwareRelease } from '../lifecycle/software-release'
import { imageRuntime } from '../lifecycle/runtime'
import { refreshImagesForPush } from '../lifecycle/image-timers'
import { wakeImagesForRepositoryChange } from '../lifecycle/repository-change-builds'
import { handleGitHubWebhook } from './webhook'
import { installedRepository } from './composition-data'
import { readGitHubRepository } from './repository-read'
import { requireFeatureResult } from '../features/result'
import { dispatchPullRequestRuns } from '../automations/pull-request-dispatch'
import { automationRunRuntime } from '../automations/run-runtime'
import { warnWorker } from '../warnings'
import { wakeQueueWebhook, wakeRepositoryQueues } from '../merge-queue/wake'

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
      queue: (route) => wakeQueueWebhook(env, route),
      pullRequest: (event, deliveryId) =>
        dispatchPullRequestRuns(
          automationRunRuntime(env, dependencies),
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
          software: await latestSoftwareRelease(env, dependencies.fetch),
        })
      },
      repositoryChange: {
        prepareDefaultBranchChange: async (
          workspace,
          values,
          installationId,
          deliveryId,
        ) => {
          requireFeatureResult(
            await workspaceBinding(env)
              .getByName(workspace.id)
              .refreshGitHub(workspace, {
                repositoryDefault: { ...values, installationId, deliveryId },
              }),
          )
        },
        read: (change) =>
          readGitHubRepository(
            dependencies,
            {
              clientId: env.GITHUB_CLIENT_ID,
              privateKey: env.GITHUB_APP_PRIVATE_KEY ?? '',
            },
            change,
          ),
        changed: async (change) => {
          try {
            await wakeImagesForRepositoryChange(
              imageRuntime(env, dependencies),
              {
                githubRepositoryId: change.repositoryId,
                installationId: change.installationId,
                software: () => latestSoftwareRelease(env, dependencies.fetch),
              },
            )
          } finally {
            await wakeRepositoryQueues(
              env,
              change.repositoryId,
              change.installationId,
            )
          }
        },
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
            warnWorker({ kind: 'automation_background_start_failed' })
          }
        }),
      ),
    )
  return response
}
