import type { AppDependencies, AppEnv, HttpFetch } from '../env'
import { lifecycleDependencies, workspaceRuntime } from '../lifecycle/runtime'

export function nativeSuspensionRuntime(
  fixture: { env: AppEnv; boat: { fetch: HttpFetch } },
  overrides: Partial<AppDependencies> = {},
) {
  return workspaceRuntime(fixture.env, {
    ...lifecycleDependencies(),
    ...overrides,
    fetch: (request) => fixture.boat.fetch(request),
  })
}
