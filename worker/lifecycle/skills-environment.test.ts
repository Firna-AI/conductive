import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { resumeCompletedWorkspace } from './completed-resume-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { saveEnvironment } from './runner-environment-test-support'

const fixtureForTest = setupBackendTests()

it('sets skills at create and refreshes them at each resume, overriding org env vars also when invalid or removed', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat } = fixture
  const save = async (repository: string) => {
    await runtime.env.DB.prepare(
      'UPDATE settings SET skills_repository = ? WHERE org_id = ?',
    )
      .bind(repository, org.id)
      .run()
  }
  await saveEnvironment(fixture, 'test-secret', false, {
    CONDUCTIVE_SKILLS_REPOSITORY: 'env/override',
  })
  await save('owner/skills')
  const resumes: unknown[] = []
  const fetch = runtime.dependencies.fetch
  runtime.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/resume'))
      resumes.push(await request.clone().json())
    return fetch(request)
  }
  const created = await fixture.run(() =>
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  expect(boat.starts[0]).toMatchObject({
    env: { CONDUCTIVE_SKILLS_REPOSITORY: 'owner/skills' },
  })
  const actor = fixture.actors.get(created.workspace.id)?.endpoint()
  if (!actor) throw new Error('Missing workspace controller')
  for (const [repository, expected] of [
    ['other/new-skills', 'other/new-skills'],
    ['owner/../bad', ''],
    ['', ''],
  ]) {
    await save(repository)
    await actor.lifecycleStopped()
    boat.states.set('bx_1', 'archived')
    await fixture.run(() =>
      resumeCompletedWorkspace(runtime, org.id, created.workspace.id, user.id),
    )
    expect(resumes.at(-1)).toMatchObject({
      env: { CONDUCTIVE_SKILLS_REPOSITORY: expected },
    })
  }
  expect(resumes).toHaveLength(3)
  await save('retention/skills')
  await actor.lifecycleStopped()
  boat.states.set('bx_1', 'archived')
  await fixture.setTime(runtime.dependencies.now() + 1_123_200_000)
  await fixture.advanceTo(runtime.dependencies.now(), created.workspace.id)
  expect(resumes).toHaveLength(4)
  expect(resumes.at(-1)).toMatchObject({
    env: {
      CONDUCTIVE_SKILLS_REPOSITORY: 'retention/skills',
      CONDUCTIVE_DISK_KEEPALIVE: '1',
    },
  })
})
