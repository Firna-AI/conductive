import { API_PATHS, type User } from '../../src/shared/api'
import type { AppDependencies } from '../env'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { LifecycleBoat } from './lifecycle-boat-test-support'
import { backendPlatform } from './backend-test-platform'
import { MemoryWorkspaceStorage } from './platform-test-storage'
import {
  START_JOB_KEY,
  START_RESULT_KEY,
  START_LOG_PREFIX,
} from './start-storage'
import type { WorkspaceStartJob, WorkspaceStartResult } from './start-types'
import { readStartJob, type StoredWorkspaceStartJob } from './start-job-codec'
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
  const session = await harness.login()
  const org = await harness.createOrg(session)
  const response = await harness.request(API_PATHS.session, session)
  const { user }: { user: User } = await response.json()
  const boat = new LifecycleBoat()

  const repositoryId = 'repository-one'
  await harness.env.DB.prepare(
    'INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id) VALUES (?, ?, 1, ?, ?, 91)',
  )
    .bind(repositoryId, org.id, 'example/repository', 'main')
    .run()
  await seedPublishedImage(harness.env.DB, {
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
  const actors = new Map<string, ReturnType<typeof backendPlatform>>()
  const accepted = new Map<string, StoredWorkspaceStartJob>()
  const queuedIds: string[] = []
  const queueWaiters: ((id: string) => void)[] = []
  let wake: () => void = () => {}
  let work = new Promise<void>((resolve) => {
    wake = resolve
  })
  const changed = () => {
    const resolve = wake
    work = new Promise<void>((next) => {
      wake = next
    })
    resolve()
  }
  const dependencies: AppDependencies = {
    fetch: boat.fetch,
    now: () => now,
    randomToken: () => `lifecycle-${++sequence}`,
  }
  const workspace = (id: string) => {
    let actor = actors.get(id)
    if (!actor) {
      actor = backendPlatform(env, dependencies, () => {
        changed()
        void actor?.storage.get('job', START_JOB_KEY).then((job) => {
          if (job && accepted.get(id)?.attempt !== job.attempt) {
            accepted.set(id, structuredClone(job))
            const waiter = queueWaiters.shift()
            if (waiter) waiter(id)
            else queuedIds.push(id)
          }
        })
      })
      actors.set(id, actor)
    }
    return actor.endpoint()
  }
  async function run<T>(operation: () => Promise<T>): Promise<T> {
    const existingAlarms = new Map(
      [...actors.values()].map((actor) => [
        actor,
        actor.storage.alarmGeneration,
      ]),
    )
    let finished = false
    const result = operation().finally(() => {
      finished = true
      changed()
    })
    void result.catch(() => {})
    while (!finished) {
      const next = [...actors.values()]
        .filter(
          (actor) =>
            actor.storage.alarmAt !== null &&
            ((actor.storage.alarmAt ?? Infinity) <= now ||
              actor.storage.alarmGeneration >
                (existingAlarms.get(actor) ?? -1)),
        )
        .sort(
          (a, b) =>
            (a.storage.alarmAt ?? Infinity) - (b.storage.alarmAt ?? Infinity),
        )[0]
      if (!next || (next.storage.alarmAt ?? Infinity) > now + 60_000) {
        await Promise.race([
          work,
          result.then(
            () => {},
            () => {},
          ),
        ])
        continue
      }
      now = Math.max(now, next.storage.alarmAt ?? now)
      harness.setTime(now)
      await next.storage.deleteAlarm()
      await next.endpoint().alarm()
    }
    return result
  }
  const starts = new Map<
    string,
    {
      job(): Promise<WorkspaceStartJob | undefined>
      advance(): Promise<void>
      wait(): Promise<WorkspaceStartResult>
      restart(): void
      lastAccepted(): WorkspaceStartJob | undefined
      storedCiphertexts(): Promise<string[]>
      holdResultRead(): ReturnType<MemoryWorkspaceStorage['holdRead']>
      holdAdmission(): ReturnType<MemoryWorkspaceStorage['holdTransaction']>
    }
  >()
  const originalWorkspace = workspace
  const endpoint = (id: string) => {
    const controller = originalWorkspace(id)
    const actor = actors.get(id)
    if (!actor) throw new Error('Missing platform actor')
    if (!starts.has(id))
      starts.set(id, {
        job: async () => {
          const job = await actor.storage.get('job', START_JOB_KEY)
          return job ? readStartJob(job) : undefined
        },
        advance: () => actor.endpoint().alarm(),
        wait: () => actor.endpoint().waitLifecycleStart(),
        restart: actor.restart,
        lastAccepted: () => {
          const job = accepted.get(id)
          return job ? readStartJob(structuredClone(job)) : undefined
        },
        storedCiphertexts: async () => [
          ...(
            await actor.storage.list('text', { prefix: START_LOG_PREFIX })
          ).values(),
        ],
        holdResultRead: () => actor.storage.holdRead(START_RESULT_KEY),
        holdAdmission: () => actor.storage.holdTransaction(),
      })
    return controller
  }
  const env = {
    ...harness.env,
    MACHINE_ORIGIN: 'https://machine.conductive.test',
  }
  const runtime: WorkspaceRuntime = { env, dependencies, workspace: endpoint }
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
    run,
    failedCreation: (id: string, senderUserId = user.id) =>
      workspace(id).failedLifecycleCreation(org.id, senderUserId),
    starts,
    nextQueued: () => {
      const id = queuedIds.shift()
      return id !== undefined
        ? Promise.resolve(id)
        : new Promise<string>((resolve) => queueWaiters.push(resolve))
    },
    pauseStarts: () => {},
    setTime: (value: number) => {
      now = value
      harness.setTime(value)
    },
    dispose: async () => {
      if (!sharedHarness) await harness.dispose()
    },
  }
}
