import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { createWorkspace } from './workspaces'
import { recordedCreationJob } from './creation-claims'

const fixtureForTest = setupBackendTests()

it('retains fast in workspace records and in the creation retry plan', async () => {
  const fixture = await fixtureForTest()
  const { runtime, org, user } = fixture
  const selected = { ...FIRST_MESSAGE.choice, fast: true }
  runtime.env.CONDUCTIVE_MODELS = JSON.stringify([
    { ...selected, label: 'Fast', efforts: ['high'], fast: true },
  ])
  const input = {
    repositoryId: fixture.repositoryId,
    firstMessage: { ...FIRST_MESSAGE, choice: selected },
  }
  const created = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, input),
  )
  expect(created.workspace.choice).toEqual(selected)
  const restored = await recordedCreationJob(
    runtime.env.DB,
    { orgId: org.id, senderUserId: user.id, messageId: FIRST_MESSAGE.id },
    created.workspace.id,
    FIRST_MESSAGE.text,
  )
  expect(restored?.creation?.request.choice).toEqual(selected)
  const repeated = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, input),
  )
  expect(repeated.workspace.choice).toEqual(selected)
})
