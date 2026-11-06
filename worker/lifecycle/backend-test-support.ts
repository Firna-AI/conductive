import { API_PATHS, type User } from '../../src/shared/api'
import type { AppDependencies } from '../env'
import { storeBoatKey } from '../sandbox/keys'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { startFixture } from './start-test-support'
import {
  retainFailedCreation,
  failedCreationForSender,
  type FailedCreationDraft,
  type FailedCreationStorage,
} from './failed-creations'
import { DurableLifecycle } from './durable'
import { TurnScopes } from './turns'
import { lifecycleFixture } from './durable-test-support'
import { LifecycleBoat } from './lifecycle-boat-test-support'
import { persistLifecycleState } from './workspace-data'
import { clearRetention, readRetention } from './retention-data'
import { keepWorkspaceDisk } from './disk-retention'
import type {
  PendingTurn,
  WorkspaceLifecycleEndpoint,
  WorkspaceRuntime,
} from './workspace-runtime'
import type { ImageRuntime, PrepareImageSources } from './image-builds'
import type { ImageCoordinatorState } from './image-timers'

export const SOFTWARE = {
  url: 'https://software.conducting.test/runner.tar.gz',
  sha256: 'a'.repeat(64),
}

export async function backendFixture(sharedHarness?: TestHarness) {
  const harness = sharedHarness ?? (await createHarness())
  const session = await harness.login()
  const org = await harness.createOrg(session)
  const response = await harness.request(API_PATHS.session, session)
  const { user }: { user: User } = await response.json()
  const boat = new LifecycleBoat()
  await storeBoatKey(harness.env, org.id, 'boat-first', boat.fetch, TEST_TIME)
  const repositoryId = 'repository-one'
  await harness.env.DB.prepare(
    'INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id) VALUES (?, ?, 1, ?, ?, 91)',
  )
    .bind(repositoryId, org.id, 'example/repository', 'main')
    .run()
  await harness.env.DB.prepare(
    'UPDATE settings SET org_image_name = ? WHERE org_id = ?',
  )
    .bind('last-good-image', org.id)
    .run()
  let now = TEST_TIME
  let sequence = 0
  const fixtures = new Map<string, ReturnType<typeof lifecycleFixture>>()
  const endpoints = new Map<string, WorkspaceLifecycleEndpoint>()
  const turns = new Map<string, TurnScopes>()
  const cleanupIds: string[] = []
  const failedDrafts = new Map<string, FailedCreationDraft>()
  const failedStore = (id: string): FailedCreationStorage => ({
    get: async () => structuredClone(failedDrafts.get(id)),
    put: async (_key, draft) => {
      failedDrafts.set(id, structuredClone(draft))
    },
  })
  const starts = new Map<string, ReturnType<typeof startFixture>>()
  let pauseStarts = false
  let queuedResolve: (id: string) => void = () => {}
  const queued = new Promise<string>((resolve) => {
    queuedResolve = resolve
  })
  const queuedIds: string[] = []
  const queueWaiters: ((id: string) => void)[] = []
  const dependencies: AppDependencies = {
    fetch: boat.fetch,
    now: () => now,
    randomToken: () => `lifecycle-${++sequence}`,
  }
  const workspace = (id: string): WorkspaceLifecycleEndpoint => {
    const prior = endpoints.get(id)
    if (prior) return prior
    const fixture = lifecycleFixture()
    const lifecycle: DurableLifecycle = fixture.lifecycle
    fixtures.set(id, fixture)
    let storedTurns: PendingTurn[] = []
    turns.set(
      id,
      new TurnScopes({
        read: async () => structuredClone(storedTurns),
        write: async (value) => {
          storedTurns = structuredClone(value)
        },
      }),
    )
    fixture.hooks.changed.mockImplementation(async (state) => {
      await persistLifecycleState(harness.env.DB, state, now)
    })
    const endpoint: WorkspaceLifecycleEndpoint = {
      queueLifecycleStart: (job) => start.enqueue(job),
      waitLifecycleStart: () => start.wait(),
      readLifecycleStartLog: () => start.readLog(),
      retainLifecycleFailedCreation: async (error, fallback) => {
        await retainFailedCreation(
          harness.env,
          failedStore(id),
          await lifecycle.read(),
          error,
          fallback,
        )
      },
      initializeLifecycle: async (input) => {
        await turns.get(id)?.register(input.firstTurn)
        await lifecycle.initialize(input)
      },
      readLifecycle: () => lifecycle.read(),
      beginLifecycleStart: async (kind) => {
        await lifecycle.beginStart(kind)
        await clearRetention(harness.env.DB, id)
      },
      lifecycleStep: (step, label, state) => lifecycle.step(step, label, state),
      lifecyclePrepared: () => lifecycle.prepared(),
      lifecycleFailed: (error) => lifecycle.fail(error),
      lifecycleStopped: async () => {
        await start.cancel()
        await lifecycle.stopped()
      },
      clearLifecycle: async () => {
        await turns.get(id)?.clear()
        await lifecycle.clear()
      },
      lifecycleActivity: () => lifecycle.activity(),
      openLifecycleTab: async (tab) => {
        lifecycle.openTab(tab)
      },
      closeLifecycleTab: async (tab) => {
        lifecycle.closeTab(tab)
      },
      credentialSender: async (turnId) =>
        (await turns.get(id)?.sender(turnId)) ?? null,
      retryFailedCreateCleanup: async (workspaceId) => {
        cleanupIds.push(workspaceId)
      },
      finishDiskMaintenance: async () => {
        await lifecycle.exclusive(async () => {
          const state = await lifecycle.read()
          if (!state) return
          while (await readRetention(harness.env.DB, id)) {
            if (
              await keepWorkspaceDisk({
                env: harness.env,
                dependencies,
                orgId: state.orgId,
                workspaceId: id,
              })
            )
              return
          }
        })
      },
    }
    const start: ReturnType<typeof startFixture> = startFixture(
      { ...harness.env, MACHINE_ORIGIN: 'https://machine.conducting.test' },
      dependencies,
      endpoint,
      pauseStarts,
      () => {
        queuedResolve(id)
        const waiter = queueWaiters.shift()
        if (waiter) waiter(id)
        else queuedIds.push(id)
      },
    )
    starts.set(id, start)
    endpoints.set(id, endpoint)
    return endpoint
  }
  const env = {
    ...harness.env,
    MACHINE_ORIGIN: 'https://machine.conducting.test',
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
    fixtures,
    turns,
    cleanupIds,
    failedCreation: (id: string, senderUserId = user.id) =>
      failedCreationForSender(
        harness.env,
        failedStore(id),
        org.id,
        senderUserId,
      ),
    starts,
    queued,
    nextQueued: () => {
      const id = queuedIds.shift()
      return id !== undefined
        ? Promise.resolve(id)
        : new Promise<string>((resolve) => queueWaiters.push(resolve))
    },
    pauseStarts: () => {
      pauseStarts = true
    },
    setTime: (value: number) => {
      now = value
      harness.setTime(value)
      for (const fixture of fixtures.values()) fixture.setTime(value)
    },
    dispose: async () => {
      if (!sharedHarness) await harness.dispose()
    },
  }
}
