import type { AppDependencies } from '../env'
import { HttpError } from '../http'
import { createGitHubImageSourceMaterializer } from './image-sources/materialize'
import { readImageSoftware } from './image-software'
import { runImageAlarm, type ImageCoordinatorState } from './image-timers'
import type { ImageRuntime } from './image-builds'
import { runningBuild } from './build-data'
import { pendingImageCleanup } from './image-maintenance-data'
import type { LifecycleEnvironment } from './runtime'

const KEY = 'org-image:coordinator'

/** Image coordinators use org-image:<orgId> names, never workspace names. */
export class ImageCoordinator {
  private readonly storage: DurableObjectStorage
  private readonly env: LifecycleEnvironment
  private readonly dependencies: AppDependencies

  constructor(
    storage: DurableObjectStorage,
    env: LifecycleEnvironment,
    dependencies: AppDependencies,
  ) {
    this.storage = storage
    this.env = env
    this.dependencies = dependencies
  }

  read(): Promise<ImageCoordinatorState | undefined> {
    return this.storage.get(KEY)
  }

  async schedule(state: ImageCoordinatorState): Promise<void> {
    if (await this.storage.get('lifecycle:state'))
      throw new HttpError(
        409,
        'coordinator_conflict',
        'The cloud computer request could not start. Try again.',
      )
    const prior = await this.read()
    if (prior && prior.orgId !== state.orgId)
      throw new HttpError(
        409,
        'coordinator_conflict',
        'The cloud computer request could not start. Try again.',
      )
    const active = await runningBuild(this.env.DB, state.orgId)
    if (active && active !== state.buildId)
      state = { ...state, buildId: active, nextAt: this.dependencies.now() }
    if (!active && state.buildId === null) {
      const cleanup = await pendingImageCleanup(this.env.DB, state.orgId)
      if (cleanup)
        state = { ...state, buildId: cleanup, nextAt: this.dependencies.now() }
    }
    await this.storage.put(KEY, {
      ...state,
      software: readImageSoftware(state.software),
    })
    await this.storage.setAlarm(state.nextAt)
  }

  async alarm(): Promise<void> {
    const state = await this.read()
    if (!state) return
    const runtime: ImageRuntime = {
      env: this.env,
      dependencies: this.dependencies,
      prepareSources: createGitHubImageSourceMaterializer(
        this.env,
        this.dependencies,
      ),
      scheduler: {
        schedule: (orgId, software, nextAt, buildId) =>
          this.schedule({ orgId, software, nextAt, buildId }),
      },
    }
    try {
      await runImageAlarm(runtime, state)
    } catch {
      await this.storage.setAlarm(this.dependencies.now() + 30_000)
    }
  }
}
