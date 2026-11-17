import { expect, it } from 'vitest'

import { readWorkspaceCapabilities } from '../secrets/capabilities-data'
import { insertSecret } from '../secrets/writes'
import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { createWorkspace } from './workspaces'

const fixtureForTest = setupBackendTests()

it('recovers the saved capabilities after a create handoff fails before workspace records exist', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, repositoryId } = fixture
  await insertSecret(runtime.env.DB, {
    id: 'saved-secret',
    orgId: org.id,
    userId: user.id,
    name: 'TOKEN',
    description: '',
    ciphertext: 'not-used-in-this-test',
    allAgents: false,
    now: 1,
  })
  const input = {
    repositoryId,
    firstMessage: FIRST_MESSAGE,
    capabilities: { preapprovedSecretIds: ['saved-secret'], macAccess: false },
  }
  const workspace = runtime.workspace
  runtime.workspace = () => {
    throw new Error('handoff unavailable')
  }
  await expect(createWorkspace(runtime, org.id, user, input)).rejects.toThrow(
    'handoff unavailable',
  )
  const claim = await runtime.env.DB.prepare(
    "SELECT workspace_id AS id FROM workspace_creation_attempts WHERE state = 'pending'",
  ).first<{ id: string }>()
  if (!claim) throw new Error('Missing creation claim')
  input.capabilities = { preapprovedSecretIds: [], macAccess: true }
  runtime.workspace = workspace
  const created = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, input),
  )
  expect(created.workspace.id).toBe(claim.id)
  expect(
    await readWorkspaceCapabilities(runtime.env.DB, org.id, claim.id),
  ).toEqual({
    preapprovedSecretIds: ['saved-secret'],
    macAccess: false,
    sessionApprovals: [],
  })
})

it('gives an internal workspace create no pre-approval and Mac access off without capabilities', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, repositoryId } = fixture
  const created = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  expect(
    await readWorkspaceCapabilities(
      runtime.env.DB,
      org.id,
      created.workspace.id,
    ),
  ).toEqual({
    preapprovedSecretIds: [],
    macAccess: false,
    sessionApprovals: [],
  })
})
