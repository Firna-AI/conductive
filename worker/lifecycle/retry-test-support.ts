import { SOFTWARE, type backendFixture } from './backend-test-support'
import { readBuildJob } from './build-data'
import { FIRST_MESSAGE } from './durable-test-support'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { ImageCoordinator } from './image-coordinator'
import { MemoryWorkspaceStorage } from './platform-test-storage'
import { createWorkspace } from './workspaces'

type Fixture = Awaited<ReturnType<typeof backendFixture>>

export function statusFault(fixture: Fixture) {
  let failing = true
  let retryAfter: string | undefined
  const fetch = fixture.runtime.dependencies.fetch
  fixture.runtime.dependencies.fetch = async (request) => {
    const response = await fetch(request)
    if (
      failing &&
      request.method === 'GET' &&
      /\/commands\/\d+$/.test(new URL(request.url).pathname)
    )
      return Response.json(
        { ok: false, code: 'unavailable' },
        {
          status: 503,
          headers:
            retryAfter === undefined ? {} : { 'Retry-After': retryAfter },
        },
      )
    return response
  }
  return {
    fail: (seconds?: string) => {
      failing = true
      retryAfter = seconds
    },
    recover: () => {
      failing = false
    },
  }
}

export async function imageRetryFixture(fixture: Fixture) {
  const { images, runtime, org, user } = fixture
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  for (let step = 0; step < 3; step++)
    await advanceImageBuild(images, org.id, id)
  const storage = new MemoryWorkspaceStorage()
  const create = () =>
    new ImageCoordinator(storage, runtime.env, runtime.dependencies)
  let actor = create()
  await actor.schedule({
    orgId: org.id,
    software: SOFTWARE,
    buildId: id,
    nextAt: runtime.dependencies.now(),
  })
  return {
    id,
    storage,
    job: () => readBuildJob(runtime.env.DB, org.id, id),
    restart: () => {
      actor = create()
    },
    requeue: (at: number) =>
      actor.schedule({
        orgId: org.id,
        software: SOFTWARE,
        buildId: id,
        nextAt: at,
      }),
    tick: async (at: number) => {
      fixture.setTime(at)
      await storage.deleteAlarm()
      await actor.alarm()
    },
  }
}

export async function startRetryFixture(fixture: Fixture) {
  const { runtime, org, user } = fixture
  const created = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const start = fixture.starts.get(created.workspace.id)
  const actor = fixture.actors.get(created.workspace.id)
  if (!start || !actor) throw new Error('Missing start actor')
  for (let step = 0; step < 12; step++) {
    const job = await start.job()
    if (job?.phase === 'startup' && job.processId !== null) break
    await start.advance()
  }
  return {
    ...start,
    endpoint: runtime.workspace(created.workspace.id),
    storage: actor.storage,
    tick: async (at: number) => {
      fixture.setTime(at)
      await start.advance()
    },
  }
}
