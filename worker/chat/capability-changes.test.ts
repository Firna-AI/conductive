import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { sessionApproval } from '../secrets/grant-data'
import { creationPreapprovals } from '../secrets/capabilities-writes'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { capabilitySecret } from './capability-context.test-support'
import { noticeFixture } from './capability-notices.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { readEnvelope } from '../../src/chat/api/read-workspace'
import { sessionTranscriptPath } from '../../src/shared/sessions'
import { workspaceCapabilitiesPath } from '../../src/shared/secrets'
import { CLAUDE } from './harness.test-support'
import { capabilityHistoryPrefix } from './history-session-keys'

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

it('diffs each session, ignores covered removals, and emits nothing for an unchanged edit', async () => {
  const f = await noticeFixture(harness)
  const first = await f.createSession()
  const second = await f.createSession()
  const empty = await f.createSession()
  const shared = await capabilitySecret(f, 'SHARED')
  const sessionOnly = await capabilitySecret(f, 'SESSION_ONLY')
  const all = await capabilitySecret(f, 'ALL', true)
  await f.env.DB.batch([
    sessionApproval(f.env.DB, {
      orgId: f.org.id,
      workspaceId: WORKSPACE_ID,
      sessionId: first.id,
      secretId: shared.id,
      userId: f.owner.id,
      now: TEST_TIME,
    }),
    sessionApproval(f.env.DB, {
      orgId: f.org.id,
      workspaceId: WORKSPACE_ID,
      sessionId: second.id,
      secretId: sessionOnly.id,
      userId: f.owner.id,
      now: TEST_TIME,
    }),
    creationPreapprovals(f.env.DB, {
      orgId: f.org.id,
      workspaceId: WORKSPACE_ID,
      secretIds: [all.id],
      userId: f.owner.id,
      now: TEST_TIME,
    }),
  ])
  await f.start(first.id, 'first')
  await f.start(second.id, 'second')
  const change = {
    preapprovedSecretIds: [shared.id],
    removeSessionApprovals: [
      { sessionId: second.id, secretId: sessionOnly.id },
    ],
  }
  await f.patch(change)
  expect(await f.waitingNotes(first.id)).toEqual([])
  expect(await f.waitingNotes(second.id)).toMatchObject([
    {
      changes: [
        { kind: 'pre-approved', names: ['SHARED'] },
        { kind: 'session-approval-removed', names: ['SESSION_ONLY'] },
      ],
    },
  ])
  expect(await f.notes(empty.id)).toEqual([])
  await f.patch(change)
  expect(await f.notes(second.id)).toHaveLength(1)
  await f.patch({
    removeSessionApprovals: [{ sessionId: first.id, secretId: shared.id }],
  })
  expect(await f.notes(first.id)).toEqual([])
  await f.patch({ preapprovedSecretIds: [], macAccess: false })
  expect(await f.waitingNotes(first.id)).toMatchObject([
    { changes: [{ kind: 'pre-approval-removed', names: ['SHARED'] }] },
  ])
  const notesBeforeMacWrite = await f.notes(first.id)
  for (const macAccess of [false, true]) {
    const response = await f.patch({ macAccess })
    expect(await response.json()).toMatchObject({ capabilities: { macAccess } })
    expect(await f.notes(first.id)).toEqual(notesBeforeMacWrite)
  }
})

it('attributes concurrent edits to their members and publishes and replays each event once', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  const secret = await capabilitySecret(f, 'DEPLOY_KEY')
  const approved = await capabilitySecret(f, 'SESSION_ONLY')
  await f.env.DB.batch([
    sessionApproval(f.env.DB, {
      orgId: f.org.id,
      workspaceId: WORKSPACE_ID,
      sessionId: session.id,
      secretId: approved.id,
      userId: f.owner.id,
      now: TEST_TIME,
    }),
  ])
  await f.start(session.id, 'first')
  const tab = await f.tab()
  await Promise.all([
    f.patch(
      {
        removeSessionApprovals: [
          { sessionId: session.id, secretId: approved.id },
        ],
      },
      f.ownerCookie,
    ),
    f.patch({ preapprovedSecretIds: [secret.id] }, f.memberCookie),
  ])
  const notes = await f.waitingNotes(session.id)
  expect(notes).toHaveLength(2)
  expect(
    notes.find((note) => note.changes[0].kind === 'session-approval-removed')
      ?.member,
  ).toMatchObject({ id: f.owner.id, displayName: 'Octocat' })
  expect(
    notes.find((note) => note.changes[0].kind === 'pre-approved')?.member,
  ).toMatchObject({ id: f.member.id, displayName: 'Teammate' })
  const live = tab.messages.flatMap((message) =>
    message.type === 'event' &&
    message.envelope.event.type === 'capabilities.changed'
      ? [message.envelope]
      : [],
  )
  expect(live).toHaveLength(2)
  const replay = await f.tab(live[0].eventNumber - 1)
  const replayed = replay.messages
    .flatMap((message) =>
      message.type === 'history' ? message.history.events : [],
    )
    .filter(({ event }) => event.type === 'capabilities.changed')
  expect(replayed).toEqual(live)
  for (const envelope of replayed)
    expect(readEnvelope(envelope)).toEqual({ ...envelope, late: false })
  await f.setEnvironment({
    CONDUCTIVE_MODELS: JSON.stringify([
      { ...CLAUDE, label: 'Test model', efforts: ['high'] },
    ]),
  })
  const response = await f.fetch(
    sessionTranscriptPath(f.org.id, WORKSPACE_ID, session.id, 'concise'),
  )
  expect(response.status).toBe(200)
  const copy: { markdown: string } = await response.json()
  expect(copy.markdown).toContain(
    'Octocat removed the approval of `SESSION_ONLY` for this session.',
  )
  expect(copy.markdown).toContain('Teammate pre-approved `DEPLOY_KEY`.')
  expect(copy.markdown).not.toContain('You ')
})

it('returns saved capabilities when note storage fails after the D1 write', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  await f.start(session.id, 'first')
  const secret = await capabilitySecret(f, 'DEPLOY_KEY')
  await f.actor.api.controls.captureWarnings(true)
  await f.setStorageHooks({
    beforeCommit: async (commit) => {
      if (
        commit.writes.some((key) =>
          key.startsWith(capabilityHistoryPrefix(session.id)),
        )
      )
        throw new Error('Note storage failed.')
    },
  })
  const response = await f.patch({ preapprovedSecretIds: [secret.id] })
  expect(await response.json()).toMatchObject({
    capabilities: { preapprovedSecretIds: [secret.id] },
  })
  expect(await f.notes(session.id)).toEqual([])
  expect((await f.actor.api.controls.warningCalls()).flat()).toContainEqual(
    expect.objectContaining({ kind: 'capability_notes_failed' }),
  )
  await f.clearFaults()
})

it('saves directly and returns capabilities when the workspace object cannot be reached', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  await f.start(session.id, 'first')
  harness.env.WORKSPACES = undefined
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const response = await harness.request(
      workspaceCapabilitiesPath(f.org.id, WORKSPACE_ID),
      f.ownerCookie,
      { method: 'PATCH', body: JSON.stringify({ macAccess: false }) },
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      capabilities: { macAccess: false },
    })
    expect(warning).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'capability_notes_unavailable' }),
    )
    expect(await f.notes(session.id)).toEqual([])
  } finally {
    warning.mockRestore()
  }
})
