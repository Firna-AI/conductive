import type { AppDependencies, AppEnv } from '../env'
import { randomToken } from '../security/crypto'
import { HttpError } from '../http'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
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
  env: AppEnv,
  dependencies = lifecycleDependencies(),
): WorkspaceRuntime {
  return {
    env,
    dependencies,
    workspace: (id) =>
      workspaceLifecycleEndpoint(
        workspaceNamespace(env).getByName(id, { locationHint: 'weur' }),
        env,
      ),
  }
}

export function imageRuntime(
  env: AppEnv & { GITHUB_APP_PRIVATE_KEY?: string },
  dependencies = lifecycleDependencies(),
): ImageRuntime {
  return {
    env,
    dependencies,
    prepareSources: createGitHubImageSourceMaterializer(env, dependencies),
    scheduler: {
      schedule: async (orgId, software, at, buildId, providerAccount) => {
        await workspaceNamespace(env)
          .getByName(`org-image:${orgId}`, {
            locationHint: 'weur',
          })
          .scheduleImage({
            orgId,
            software,
            nextAt: at,
            buildId,
            ...(providerAccount && providerAccount !== DEFAULT_PROVIDER_ACCOUNT
              ? { providerAccount }
              : {}),
          })
      },
    },
  }
}

function workspaceNamespace(env: AppEnv): NonNullable<AppEnv['WORKSPACES']> {
  if (!env.WORKSPACES)
    throw new HttpError(
      503,
      'service_unavailable',
      'The app is not available. Try again.',
    )
  return env.WORKSPACES
}
