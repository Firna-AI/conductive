import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { seedPublishedImage } from './published-image-test-support'

const fixtureForTest = setupBackendTests()

it('refuses a waiting repository when the image changes before claim admission', async () => {
  const { runtime, org, user, repositoryId } = fixtureForTest()
  const db = runtime.env.DB
  let published = false
  runtime.env.DB = new Proxy(db, {
    get(target, property) {
      if (property === 'batch')
        return async (queries: D1PreparedStatement[]) => {
          if (!published) {
            published = true
            await seedPublishedImage(db, {
              orgId: org.id,
              buildId: 'replacement-build',
              imageName: 'replacement-image',
              repositories: [],
              software: SOFTWARE,
              now: runtime.dependencies.now(),
            })
          }
          return target.batch(queries)
        }
      const value: unknown = Reflect.get(target, property)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  await expect(
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  ).rejects.toMatchObject({
    status: 404,
    code: 'repository_not_found',
    message: 'The repository is ready after the next build.',
  })
  expect(published).toBe(true)
  expect(
    await db
      .prepare('SELECT COUNT(*) AS count FROM workspace_creation_attempts')
      .first('count'),
  ).toBe(0)
})
