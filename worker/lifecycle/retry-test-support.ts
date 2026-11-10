import { SOFTWARE, type backendFixture } from './backend-test-support'
import { readBuildJob } from './build-data'
import { FIRST_MESSAGE } from './durable-test-support'
import { advanceImageBuild, startImageBuild } from './image-builds'
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

export async function imageRetryFixture(
  fixture: Fixture,
  {
    kind = 'build',
    steps = 3,
  }: { kind?: 'build' | 'refresh'; steps?: number } = {},
) {
  const { images, runtime, org, user } = fixture
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind,
    software: SOFTWARE,
  })
  for (let step = 0; step < steps; step++)
    await advanceImageBuild(images, org.id, id)
  const name = `org-image:${org.id}`
  runtime.workspace(name)
  const actor = fixture.actors.get(name)
  if (!actor) throw new Error('The native image coordinator is missing.')
  const schedule = (at: number) =>
    actor.endpoint().scheduleImage({
      orgId: org.id,
      software: SOFTWARE,
      buildId: id,
      nextAt: at,
    })
  await schedule(runtime.dependencies.now())
  return {
    id,
    storage: actor.storage,
    job: () => readBuildJob(runtime.env.DB, org.id, id),
    restart: actor.restart,
    requeue: schedule,
    tick: async (at: number) => {
      await fixture.advanceTo(at, name)
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
      await fixture.advanceTo(at, created.workspace.id)
    },
  }
}
