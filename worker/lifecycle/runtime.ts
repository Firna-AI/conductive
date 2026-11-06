import type { AppDependencies, AppEnv } from '../env'
import { randomToken } from '../security/crypto'
import type { Workspace } from '../workspace'
import type { ImageRuntime } from './image-builds'
import { createGitHubImageSourceMaterializer } from './image-sources/materialize'
import type { WorkspaceRuntime } from './workspace-runtime'
import { workspaceLifecycleEndpoint } from './workspace-transport'

export interface LifecycleEnvironment extends AppEnv {
  WORKSPACES: DurableObjectNamespace<Workspace>
  GITHUB_APP_PRIVATE_KEY?: string
}

export function lifecycleDependencies(): AppDependencies {
  return { fetch: (request) => fetch(request), now: Date.now, randomToken }
}

export function workspaceRuntime(
  env: LifecycleEnvironment,
  dependencies = lifecycleDependencies(),
): WorkspaceRuntime {
  return {
    env,
    dependencies,
    workspace: (id) =>
      workspaceLifecycleEndpoint(
        env.WORKSPACES.getByName(id, { locationHint: 'weur' }),
        env,
      ),
  }
}

export function imageRuntime(
  env: LifecycleEnvironment,
  dependencies = lifecycleDependencies(),
): ImageRuntime {
  return {
    env,
    dependencies,
    prepareSources: createGitHubImageSourceMaterializer(env, dependencies),
    scheduler: {
      schedule: async (orgId, software, at, buildId) => {
        await env.WORKSPACES.getByName(`org-image:${orgId}`, {
          locationHint: 'weur',
        }).scheduleImage({ orgId, software, nextAt: at, buildId })
      },
    },
  }
}
