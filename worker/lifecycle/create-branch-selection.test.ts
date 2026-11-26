import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { branchGitHub, browserBranchCreate } from './start-branch.test-support'

const backend = setupBackendTests()

it('checks a named branch of the published image after repository selection changes', async () => {
  const h = backend()
  const api = await branchGitHub(h)
  await h.runtime.env.DB.prepare(
    'UPDATE repositories SET selected = 0, installation_id = NULL WHERE id = ?',
  )
    .bind(h.repositoryId)
    .run()
  const creating = browserBranchCreate(h, {
    startBranch: 'develop',
    baseBranch: 'main',
  })
  await expect(creating).resolves.toMatchObject({ status: 201 })
  const response = await creating
  expect(await response!.json()).toMatchObject({
    workspace: { repositoryId: h.repositoryId },
  })
  expect(
    api.requests.map((request) => request.headers.get('Authorization')),
  ).toEqual(['Bearer create-sender-token'])
})
