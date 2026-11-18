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
  const save = async (repository: string, trust = '') => {
    await runtime.env.DB.prepare(
      `UPDATE settings SET skills_repository = ?, trusted_skills_repository = ?
       WHERE org_id = ?`,
    )
      .bind(repository, trust, org.id)
      .run()
  }
  await saveEnvironment(fixture, 'test-secret', false, {
    CONDUCTIVE_SKILLS_REPOSITORY: 'env/override',
    CONDUCTIVE_TRUSTED_SKILLS_REPOSITORY: 'env/override',
  })
  await save('Owner/Skills', 'owner/skills')
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
    env: {
      CONDUCTIVE_SKILLS_REPOSITORY: 'Owner/Skills',
      CONDUCTIVE_TRUSTED_SKILLS_REPOSITORY: 'owner/skills',
    },
  })
  const actor = fixture.actors.get(created.workspace.id)?.endpoint()
  if (!actor) throw new Error('Missing workspace controller')
  for (const [repository, trust, expected, expectedTrust] of [
    ['other/new-skills', '', 'other/new-skills', ''],
    ['owner/../bad', 'owner/../bad', '', ''],
    ['', 'owner/skills', '', ''],
  ]) {
    await save(repository, trust)
    await actor.lifecycleStopped()
    boat.states.set('bx_1', 'archived')
    await fixture.run(() =>
      resumeCompletedWorkspace(runtime, org.id, created.workspace.id, user.id),
    )
    expect(resumes.at(-1)).toMatchObject({
      env: {
        CONDUCTIVE_SKILLS_REPOSITORY: expected,
        CONDUCTIVE_TRUSTED_SKILLS_REPOSITORY: expectedTrust,
      },
    })
  }
  expect(resumes).toHaveLength(3)
  await save('retention/skills', 'RETENTION/SKILLS')
  await actor.lifecycleStopped()
  boat.states.set('bx_1', 'archived')
  await fixture.setTime(runtime.dependencies.now() + 1_123_200_000)
  await fixture.advanceTo(runtime.dependencies.now(), created.workspace.id)
  expect(resumes).toHaveLength(4)
  expect(resumes.at(-1)).toMatchObject({
    env: {
      CONDUCTIVE_SKILLS_REPOSITORY: 'retention/skills',
      CONDUCTIVE_TRUSTED_SKILLS_REPOSITORY: 'retention/skills',
      CONDUCTIVE_DISK_KEEPALIVE: '1',
    },
  })
})
