import { expect, it } from 'vitest'

import { routes } from '../../src/app/router'
import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { createWorkspace } from './workspaces'

const fixtureForTest = setupBackendTests()

it('presents an old create admission with its saved fields and current number and link', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, repositoryId } = fixture
  const workspace = runtime.workspace
  runtime.workspace = (id) => {
    const endpoint = workspace(id)
    return {
      ...endpoint,
      async waitCreationAdmission() {
        const result = await endpoint.waitCreationAdmission()
        if (!result.ok) return result
        const snapshot = {
          ...result.created.workspace,
          name: 'Saved admission',
        }
        delete snapshot.number
        delete snapshot.link
        return {
          ...result,
          created: { ...result.created, workspace: snapshot },
        }
      },
    }
  }
  const created = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  expect(created.workspace).toMatchObject({
    number: 1,
    link: `${runtime.env.APP_ORIGIN}${routes.workspace(org.id, created.workspace.id)}`,
    name: 'Saved admission',
    state: 'starting',
  })
})
