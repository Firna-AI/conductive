import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { resumeCompletedWorkspace } from './completed-resume-test-support'
import { FIRST_MESSAGE } from './durable-test-support'

const backend = setupBackendTests()

it('keeps the pull request base on resume and on the disk retention restart', async () => {
  const h = await backend()
  const created = await h.run(() =>
    createCompletedWorkspace(
      h.runtime,
      h.org.id,
      h.user,
      {
        repositoryId: h.repositoryId,
        firstMessage: FIRST_MESSAGE,
      },
      h.user,
      { branch: 'feature/review', startSha: 'a'.repeat(40) },
    ),
  )
  const id = created.workspace.id
  const actor = h.actors.get(id)!.endpoint()
  await h.runtime.env.DB.prepare(
    'UPDATE repositories SET default_branch = ? WHERE id = ?',
  )
    .bind('new-default', h.repositoryId)
    .run()
  await actor.lifecycleStopped()
  h.boat.states.set('bx_1', 'archived')
  await h.run(() =>
    resumeCompletedWorkspace(h.runtime, h.org.id, id, h.user.id),
  )
  const resumed = h.boat.server.requests.filter((request) =>
    new URL(request.url).pathname.endsWith('/resume'),
  )
  expect(resumed).toHaveLength(1)
  expect(await resumed[0].json()).toMatchObject({
    env: { CONDUCTIVE_DEFAULT_BRANCH: 'feature/review' },
  })
  expect(h.starts.get(id)!.lastAccepted()).toMatchObject({
    baseBranch: 'feature/review',
  })
  await actor.lifecycleStopped()
  h.boat.states.set('bx_1', 'archived')
  const maintenanceAt = (await actor.readLifecycle())!.nextDiskKeepaliveAt!
  await h.setTime(maintenanceAt)
  await actor.advance()
  const retained = h.boat.server.requests.filter((request) =>
    new URL(request.url).pathname.endsWith('/resume'),
  )
  expect(retained).toHaveLength(2)
  expect(await retained[1].json()).toMatchObject({
    env: {
      CONDUCTIVE_DEFAULT_BRANCH: 'feature/review',
      CONDUCTIVE_DISK_KEEPALIVE: '1',
    },
  })
})
