import { afterEach, beforeAll, expect, it } from 'vitest'

import { secretPath, workspaceCapabilitiesPath } from '../../src/shared/secrets'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { addSecret, addSessionApproval } from './secrets.test-support'
import { CLAUDE } from '../chat/harness.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('lets each member change workspace capabilities and remove only the selected session approval', async () => {
  fixture = await createOuterRuntime(bundle)
  await fixture.env.DB.prepare(
    `INSERT INTO workspace_runtime
     (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id)
     VALUES (?, ?, 'owner', 'session-one', 'first-turn', ?, ?, ?, 'first-message')`,
  )
    .bind(OUTER_WORKSPACE, OUTER_ORG, CLAUDE.agent, CLAUDE.model, CLAUDE.effort)
    .run()
  const path = workspaceCapabilitiesPath(OUTER_ORG, OUTER_WORKSPACE)
  const initial = await fixture.request(path)
  expect(initial.status).toBe(200)
  expect(await initial.json()).toEqual({
    capabilities: {
      macAccess: true,
      preapprovedSecretIds: [],
      sessionApprovals: [],
    },
  })
  const secret = await addSecret(fixture, OUTER_ORG)
  const member = { Cookie: fixture.cookies.memberCookie }
  await addSessionApproval(
    fixture,
    OUTER_ORG,
    OUTER_WORKSPACE,
    'session-one',
    secret.id,
  )
  await addSessionApproval(
    fixture,
    OUTER_ORG,
    OUTER_WORKSPACE,
    'session-two',
    secret.id,
  )
  await addSessionApproval(
    fixture,
    OUTER_ORG,
    OTHER_WORKSPACE,
    'session-one',
    secret.id,
  )
  const changed = await fixture.request(path, {
    method: 'PATCH',
    headers: member,
    body: JSON.stringify({
      macAccess: false,
      preapprovedSecretIds: [secret.id],
      removeSessionApprovals: [
        { secretId: secret.id, sessionId: 'session-one' },
      ],
    }),
  })
  expect(changed.status).toBe(200)
  expect(await changed.json()).toMatchObject({
    capabilities: {
      macAccess: false,
      preapprovedSecretIds: [secret.id],
      sessionApprovals: [
        {
          secretId: secret.id,
          sessionId: 'session-two',
          approvedByUserId: 'member',
          approvedBy: { id: 'member' },
          approvedAt: 123,
        },
      ],
    },
  })
  const otherPath = workspaceCapabilitiesPath(OUTER_ORG, OTHER_WORKSPACE)
  expect(await (await fixture.request(otherPath)).json()).toMatchObject({
    capabilities: {
      macAccess: true,
      sessionApprovals: [{ sessionId: 'session-one', secretId: secret.id }],
    },
  })
  expect(
    (
      await fixture.request(path, {
        method: 'PATCH',
        headers: member,
        body: JSON.stringify({ preapprovedSecretIds: [], macAccess: true }),
      })
    ).status,
  ).toBe(200)
  expect(await (await fixture.request(path)).json()).toMatchObject({
    capabilities: { macAccess: true, preapprovedSecretIds: [] },
  })
  const otherSecret = await addSecret(
    fixture,
    'other-org',
    'OTHER',
    fixture.cookies.outsiderCookie,
  )
  const invalid = await fixture.request(path, {
    method: 'PATCH',
    headers: member,
    body: JSON.stringify({
      preapprovedSecretIds: [otherSecret.id],
      macAccess: false,
    }),
  })
  expect(invalid.status).toBe(404)
  expect(await (await fixture.request(path)).json()).toMatchObject({
    capabilities: { macAccess: true, preapprovedSecretIds: [] },
  })
  expect(
    (
      await fixture.request(path, {
        headers: { Cookie: fixture.cookies.outsiderCookie },
      })
    ).status,
  ).toBe(404)
  await fixture.env.DB.prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
    .bind(OUTER_ORG)
    .run()
  const suspended = await fixture.request(path, {
    method: 'PATCH',
    headers: member,
    body: JSON.stringify({ macAccess: false }),
  })
  expect(suspended.status).toBe(403)
  expect(await suspended.json()).toMatchObject({
    error: { code: 'org_suspended' },
  })
})

it('deletes every grant with its secret and gives a new secret of the same name no grants', async () => {
  fixture = await createOuterRuntime(bundle)
  const secret = await addSecret(fixture, OUTER_ORG)
  for (const workspaceId of [OUTER_WORKSPACE, OTHER_WORKSPACE]) {
    const path = workspaceCapabilitiesPath(OUTER_ORG, workspaceId)
    expect(
      (
        await fixture.request(path, {
          method: 'PATCH',
          body: JSON.stringify({ preapprovedSecretIds: [secret.id] }),
        })
      ).status,
    ).toBe(200)
    await addSessionApproval(
      fixture,
      OUTER_ORG,
      workspaceId,
      'session',
      secret.id,
    )
    expect(await (await fixture.request(path)).json()).toMatchObject({
      capabilities: {
        preapprovedSecretIds: [secret.id],
        sessionApprovals: [{ secretId: secret.id }],
      },
    })
  }
  expect(
    (
      await fixture.request(secretPath(OUTER_ORG, secret.id), {
        method: 'DELETE',
        body: '{}',
      })
    ).status,
  ).toBe(204)
  const replacement = await addSecret(fixture, OUTER_ORG)
  expect(replacement.id).not.toBe(secret.id)
  for (const workspaceId of [OUTER_WORKSPACE, OTHER_WORKSPACE]) {
    const read = await fixture.request(
      workspaceCapabilitiesPath(OUTER_ORG, workspaceId),
    )
    expect(read.status).toBe(200)
    expect(await read.json()).toEqual({
      capabilities: {
        macAccess: true,
        preapprovedSecretIds: [],
        sessionApprovals: [],
      },
    })
  }
})
