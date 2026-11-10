import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { seedPublishedImage } from './published-image-test-support'

const fixtureForTest = setupBackendTests()

it('pins the runner version to the saved image account when snapshot names match across accounts', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, repositoryId, boat } = fixture
  const db = runtime.env.DB
  boat.server.addAccount({ orgId: 'second-org', apiKey: 'boat-second' })
  runtime.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    secondary: { kind: 'boat', orgId: 'second-org', apiKey: 'boat-second' },
  })
  await db
    .prepare('UPDATE orgs SET provider_account = ? WHERE id = ?')
    .bind('secondary', org.id)
    .run()
  const imageName = 'same-image-in-two-accounts'
  const repositories = [
    {
      id: repositoryId,
      orgId: org.id,
      fullName: 'example/repository',
      defaultBranch: 'main',
    },
  ]
  await seedPublishedImage(db, {
    orgId: org.id,
    buildId: 'other-account-runner-image',
    imageName,
    providerAccount: 'boat',
    repositories,
    software: SOFTWARE,
    now: TEST_TIME + 100,
    runnerProtocolVersion: 1,
  })
  await seedPublishedImage(db, {
    orgId: org.id,
    buildId: 'selected-account-runner-image',
    imageName,
    providerAccount: 'secondary',
    repositories,
    software: SOFTWARE,
    now: TEST_TIME - 100,
    runnerProtocolVersion: 2,
  })
  const created = await fixture.run(() =>
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  expect(
    await db
      .prepare(
        'SELECT provider_account AS account, runner_protocol_version AS version FROM workspaces WHERE id = ?',
      )
      .bind(created.workspace.id)
      .first(),
  ).toEqual({ account: 'secondary', version: 2 })
})
