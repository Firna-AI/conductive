import type { WorkspaceStorage } from './platform-storage'
import type { AppEnv } from '../env'
import type { AppDependencies } from '../env'
import { HttpError } from '../http'
import { createGitHubImageSourceMaterializer } from './image-sources/materialize'
import { readImageSoftware } from './image-software'
import { runImageAlarm, type ImageCoordinatorState } from './image-timers'
import type { ImageRuntime } from './image-builds'
import { readImageSchedule } from './image-schedule'

const KEY = 'org-image:coordinator'

/** Image coordinators use org-image:<orgId> names, never workspace names. */
export class ImageCoordinator {
  private readonly storage: WorkspaceStorage
  private readonly env: AppEnv & { GITHUB_APP_PRIVATE_KEY?: string }
  private readonly dependencies: AppDependencies

  constructor(
    storage: WorkspaceStorage,
    env: AppEnv & { GITHUB_APP_PRIVATE_KEY?: string },
    dependencies: AppDependencies,
  ) {
    this.storage = storage
    this.env = env
    this.dependencies = dependencies
  }

  read(): Promise<ImageCoordinatorState | undefined> {
    return this.storage.get('image', KEY)
  }

  async schedule(state: ImageCoordinatorState): Promise<void> {
    if (await this.storage.get('lifecycle', 'lifecycle:state'))
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
    const next = await readImageSchedule(
      this.env.DB,
      state.orgId,
      this.dependencies.now(),
      state,
    )
    state = { ...state, buildId: next.buildId, nextAt: next.nextAt }
    await this.storage.put('image', KEY, {
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
