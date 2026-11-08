import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  acceptOrgInvitePath,
  PENDING_ORG_INVITES_PATH,
} from '../../src/shared/members'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { featureFixture, type FeatureFixture } from './fixture.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('lists only current verified-email invitations and accepts one explicitly through the production routes', async () => {
  const active = (fixture = await featureFixture(bundle))
  await active.env.DB.batch([
    active.env.DB.prepare(
      "INSERT INTO user_verified_emails (user_id, email) VALUES ('outsider', 'person@example.test')",
    ),
    active.env.DB.prepare(
      "INSERT INTO org_invites (id, org_id, email, invited_by_user_id, created_at) VALUES ('invitation', 'chat-org', 'person@example.test', 'owner', 1), ('foreign', 'chat-org', 'other@example.test', 'owner', 2)",
    ),
  ])
  const headers = { Cookie: active.cookies.outsiderCookie }
  const list = await active.request(PENDING_ORG_INVITES_PATH, { headers })
  expect(list.status).toBe(200)
  expect(await list.json()).toEqual({
    invites: [
      {
        id: 'invitation',
        email: 'person@example.test',
        createdAt: 1,
        orgId: 'chat-org',
        orgName: 'Chat org',
      },
    ],
  })
  expect(
    await active.env.DB.prepare(
      "SELECT role FROM org_members WHERE org_id = 'chat-org' AND user_id = 'outsider'",
    ).first(),
  ).toBeNull()
  const foreign = await active.request(acceptOrgInvitePath('foreign'), {
    method: 'POST',
    headers,
    body: '{}',
  })
  expect(foreign.status).toBe(404)
  const accepted = await active.request(acceptOrgInvitePath('invitation'), {
    method: 'POST',
    headers,
    body: '{}',
  })
  expect(accepted.status).toBe(200)
  expect(await accepted.json()).toEqual({
    org: { id: 'chat-org', name: 'Chat org', role: 'member' },
  })
  expect(
    await (await active.request(PENDING_ORG_INVITES_PATH, { headers })).json(),
  ).toEqual({ invites: [] })
})
