import type { AppDependencies } from '../env'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { LifecycleBoat } from './lifecycle-boat-test-support'
import { backendActor, type BackendActor } from './backend-test-platform'
import { backendPump } from './backend-pump.test-support'
import { backendStart } from './backend-start.test-support'
import {
  backendImageFetch,
  imageAppKey,
} from './backend-image-fetch.test-support'
import { seedBackend } from './backend-seed.test-support'
import type { StoredWorkspaceStartJob } from './start-job-codec'
import type { WorkspaceRuntime } from './workspace-runtime'
import type { ImageRuntime, PrepareImageSources } from './image-builds'
import type { ImageCoordinatorState } from './image-timers'
import { seedPublishedImage } from './published-image-test-support'

export const SOFTWARE = {
  url: 'https://software.conductive.test/runner.tar.gz',
  sha256: 'a'.repeat(64),
}

export async function backendFixture(sharedHarness?: TestHarness) {
  const harness = sharedHarness ?? (await createHarness())
  const { session, org, user } = await seedBackend(harness)
  const boat = new LifecycleBoat()
  const env = {
    ...harness.env,
    WORKSPACES: harness.native.bindings.WORKSPACES,
    MACHINE_ORIGIN: 'https://machine.conductive.test',
  }
  const repositoryId = 'repository-one'
  await env.DB.prepare(
    'INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id) VALUES (?, ?, 1, ?, ?, 91)',
  )
    .bind(repositoryId, org.id, 'example/repository', 'main')
    .run()
  await seedPublishedImage(env.DB, {
    orgId: org.id,
    buildId: 'published-image',
    imageName: 'last-good-image',
    repositories: [
      {
        id: repositoryId,
        orgId: org.id,
        fullName: 'example/repository',
        defaultBranch: 'main',
      },
    ],
    software: SOFTWARE,
    now: TEST_TIME - 1,
  })
  let now = TEST_TIME
  let sequence = 0
  const dependencies: AppDependencies = {
    fetch: backendImageFetch(env, boat.fetch, harness.github.fetch),
    now: () => now,
    randomToken: () => `lifecycle-${++sequence}`,
  }
  harness.setNativeFetch((request) => dependencies.fetch(request))
  const actors = new Map<string, BackendActor>()
  const accepted = new Map<string, StoredWorkspaceStartJob>()
  const queuedIds: string[] = []
  const queueWaiters: ((id: string) => void)[] = []
  const starts = new Map<string, ReturnType<typeof backendStart>>()
  const setTime = async (value: number) => {
    now = value
    harness.setTime(value)
    await harness.native.setTime(value)
  }
  const advanceTo = async (at: number, workspaceId?: string) => {
    now = at
    harness.setTime(at)
    return harness.native.advanceTo(
      at,
      workspaceId === undefined ? undefined : [workspaceId],
    )
  }
  const pump = backendPump(actors, dependencies.now, advanceTo)
  const workspace = (id: string) => {
    let actor = actors.get(id)
    if (!actor) {
      actor = backendActor(
        harness,
        id,
        {
          MACHINE_ORIGIN: env.MACHINE_ORIGIN,
          GITHUB_APP_PRIVATE_KEY: id.startsWith('org-image:')
            ? imageAppKey()
            : undefined,
        },
        pump.changed,
        (job) => {
          if (accepted.get(id)?.attempt === job.attempt) return
          accepted.set(id, structuredClone(job))
          const waiter = queueWaiters.shift()
          if (waiter) waiter(id)
          else queuedIds.push(id)
        },
        dependencies.now,
        (at) => advanceTo(at, id),
      )
      actors.set(id, actor)
      starts.set(
        id,
        backendStart(
          actor,
          dependencies.now,
          (at) => advanceTo(at, id),
          () => accepted.get(id),
        ),
      )
    }
    return actor.endpoint()
  }
  const runtime: WorkspaceRuntime = { env, dependencies, workspace }
  const scheduled: ImageCoordinatorState[] = []
  const sourceCalls: Parameters<PrepareImageSources>[0][] = []
  const images: ImageRuntime = {
    env,
    dependencies,
    prepareSources: async (input) => {
      sourceCalls.push(input)
    },
    scheduler: {
      schedule: async (orgId, software, nextAt, buildId) => {
        scheduled.push({ orgId, software, nextAt, buildId })
      },
    },
  }
  return {
    harness,
    session,
    org,
    user,
    boat,
    runtime,
    images,
    scheduled,
    sourceCalls,
    repositoryId,
    actors,
    starts,
    setTime,
    advanceTo,
    run: pump.run,
    nextQueued: () => {
      const id = queuedIds.shift()
      return id === undefined
        ? new Promise<string>((resolve) => queueWaiters.push(resolve))
        : Promise.resolve(id)
    },
    pauseStarts: () => {},
    dispose: async () => {
      if (!sharedHarness) await harness.dispose()
    },
  }
}
