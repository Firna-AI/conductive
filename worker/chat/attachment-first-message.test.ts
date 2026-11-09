import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { User } from '../../src/shared/api'
import type { FirstWorkspaceMessage } from '../lifecycle/workspace-runtime'
import { deleteProvisionalWorkspace } from '../lifecycle/workspace-data'
import { seedWorkspace } from '../members/members-test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { attachmentFixture, FILE_BYTES } from './attachment.test-support'
import { readAttachment } from './attachment-data'
import { expireClaimedAttachment } from './attachment-cleanup'
import { WorkspaceChat } from './backend'
import { CLAUDE, WORKSPACE_ID } from './harness.test-support'
import { MemoryChatStorage } from './memory-storage.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

async function firstMessage(
  orgId: string,
  userId: string,
  workspaceId: string,
  attachmentId: string,
): Promise<FirstWorkspaceMessage> {
  await harness.env.DB.prepare(
    `INSERT INTO workspace_runtime
    (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      workspaceId,
      orgId,
      userId,
      `${workspaceId}-session`,
      `${workspaceId}-turn`,
      CLAUDE.agent,
      CLAUDE.model,
      CLAUDE.effort,
      'stable-first-message',
    )
    .run()
  await harness.env.DB.prepare(
    `INSERT INTO workspace_creation_attempts
    (workspace_id, org_id, sender_user_id, first_message_id, created_at) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(workspaceId, orgId, userId, 'stable-first-message', TEST_TIME)
    .run()
  const sender = await harness.env.DB.prepare(
    `SELECT id, github_id AS githubId, github_login AS githubLogin,
    display_name AS displayName, avatar_url AS avatarUrl FROM users WHERE id = ?`,
  )
    .bind(userId)
    .first<User>()
  if (!sender) throw new Error('The sender is missing.')
  return {
    workspaceId,
    sessionId: `${workspaceId}-session`,
    turnId: `${workspaceId}-turn`,
    sender,
    request: {
      id: 'stable-first-message',
      text: 'Use my file',
      attachmentIds: [attachmentId],
      choice: CLAUDE,
    },
  }
}

it('admits a first-message file before a computer exists and replays acceptance before another claim', async () => {
  const fixture = await attachmentFixture(harness)
  const file = await fixture.upload(FILE_BYTES, {
    type: 'new-workspace',
    messageId: 'stable-first-message',
  })
  const first = await firstMessage(
    fixture.org.id,
    fixture.owner.id,
    WORKSPACE_ID,
    file.id,
  )
  const accepted = await fixture.chat.runLifecycle(() =>
    fixture.chat.acceptFirstMessage(first),
  )
  expect(accepted).toMatchObject({
    id: first.request.id,
    attachments: [file],
    state: 'queued',
  })
  expect(await readAttachment(harness.env.DB, file.id)).toMatchObject({
    state: 'claimed',
    claimedWorkspaceId: WORKSPACE_ID,
  })
  const before = await fixture.chat.store.read(
    WORKSPACE_ID,
    async (view) => view.eventNumber,
  )
  await harness.env.DB.prepare(
    "UPDATE chat_attachments SET state = 'deleting' WHERE id = ?",
  )
    .bind(file.id)
    .run()
  expect(
    await fixture.chat.runLifecycle(() =>
      fixture.chat.acceptFirstMessage(first),
    ),
  ).toEqual(accepted)
  expect(
    await fixture.chat.store.read(
      WORKSPACE_ID,
      async (view) => view.eventNumber,
    ),
  ).toBe(before)
})

it('retains a removed workspace file for a new attempt and fences cleanup of the old claim', async () => {
  const fixture = await attachmentFixture(harness)
  const file = await fixture.upload(FILE_BYTES, {
    type: 'new-workspace',
    messageId: 'stable-first-message',
  })
  const first = await firstMessage(
    fixture.org.id,
    fixture.owner.id,
    WORKSPACE_ID,
    file.id,
  )
  await fixture.chat.runLifecycle(() => fixture.chat.acceptFirstMessage(first))
  const old = await readAttachment(harness.env.DB, file.id)
  if (!old) throw new Error('The claim is missing.')
  await harness.env.DB.prepare(
    "UPDATE workspace_creation_attempts SET state = 'failed' WHERE workspace_id = ?",
  )
    .bind(WORKSPACE_ID)
    .run()
  await deleteProvisionalWorkspace(harness.env.DB, fixture.org.id, WORKSPACE_ID)
  await seedWorkspace(harness, fixture.org, first.sender, 'new-attempt', 'repo')
  const retry = await firstMessage(
    fixture.org.id,
    fixture.owner.id,
    'new-attempt',
    file.id,
  )
  const chat = new WorkspaceChat(new MemoryChatStorage(), harness.env, {
    now: () => TEST_TIME + 1,
    prepareAttachments: async () => null,
  })
  expect(
    await chat.runLifecycle(() => chat.acceptFirstMessage(retry)),
  ).toMatchObject({ attachments: [file] })
  await fixture.chat.runLifecycle(() =>
    expireClaimedAttachment(
      harness.env,
      fixture.chat.store,
      WORKSPACE_ID,
      fixture.org.id,
      file.id,
      old.revision,
      TEST_TIME + 604_800_000,
    ),
  )
  expect(await readAttachment(harness.env.DB, file.id)).toMatchObject({
    claimedWorkspaceId: 'new-attempt',
  })
  const current = await readAttachment(harness.env.DB, file.id)
  if (!current) throw new Error('The new claim is missing.')
  await chat.runLifecycle(() =>
    expireClaimedAttachment(
      harness.env,
      chat.store,
      'new-attempt',
      fixture.org.id,
      file.id,
      current.revision,
      TEST_TIME + 604_800_000,
    ),
  )
  expect(await fixture.bytes(file.id)).toEqual(FILE_BYTES)
})

it('expires a removed workspace draft at its original upload deadline', async () => {
  const fixture = await attachmentFixture(harness)
  const file = await fixture.upload(FILE_BYTES, {
    type: 'new-workspace',
    messageId: 'stable-first-message',
  })
  const first = await firstMessage(
    fixture.org.id,
    fixture.owner.id,
    WORKSPACE_ID,
    file.id,
  )
  await fixture.chat.runLifecycle(() => fixture.chat.acceptFirstMessage(first))
  await harness.env.DB.prepare(
    "UPDATE workspace_creation_attempts SET state = 'failed' WHERE workspace_id = ?",
  )
    .bind(WORKSPACE_ID)
    .run()
  await deleteProvisionalWorkspace(harness.env.DB, fixture.org.id, WORKSPACE_ID)
  const record = await readAttachment(harness.env.DB, file.id)
  if (!record) throw new Error('The claim is missing.')
  await fixture.chat.runLifecycle(() =>
    expireClaimedAttachment(
      harness.env,
      fixture.chat.store,
      WORKSPACE_ID,
      fixture.org.id,
      file.id,
      record.revision,
      TEST_TIME + 604_799_999,
    ),
  )
  expect(await fixture.bytes(file.id)).toEqual(FILE_BYTES)
  await fixture.chat.runLifecycle(() =>
    expireClaimedAttachment(
      harness.env,
      fixture.chat.store,
      WORKSPACE_ID,
      fixture.org.id,
      file.id,
      record.revision,
      TEST_TIME + 604_800_000,
    ),
  )
  expect(await readAttachment(harness.env.DB, file.id)).toBeNull()
})
