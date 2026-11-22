import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { ChatEvent } from '../../src/shared/chat-events'
import type { NewestChatHistoryResponse } from '../../src/shared/events'
import { chatHistoryPath } from '../../src/shared/events'
import { sessionTranscriptPath } from '../../src/shared/sessions'
import { repositoryChangeFixture } from '../lifecycle/repository-change.test-support'
import {
  REPOSITORY_CHANGE_JOB_KEY,
  repositoryChangedKey,
  repositoryChangeJobKey,
  type RepositoryChangeJob,
} from '../lifecycle/repository-change-types'
import { orgEnvironmentContext } from '../lifecycle/settings-data'
import { encrypt } from '../security/crypto'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  createChatFixture,
  WORKSPACE_ID,
  type ChatFixture,
} from './harness.test-support'
import { transcriptFixture } from './transcript.test-support'

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

async function captureSecret(f: ChatFixture, secret = 'fixture-secret') {
  const ciphertext = await encrypt(
    JSON.stringify({ DUMMY: secret }),
    orgEnvironmentContext(f.org.id),
    f.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await f.env.DB.prepare(
    `INSERT INTO workspace_runtime
     (workspace_id, org_id, created_by_user_id, session_id, first_turn_id,
      environment_ciphertext, agent, model, effort, first_message_id)
     VALUES (?, ?, ?, 'unused', 'unused', ?, 'claude', 'test', 'high', 'unused')
     ON CONFLICT(workspace_id) DO UPDATE SET environment_ciphertext = excluded.environment_ciphertext`,
  )
    .bind(WORKSPACE_ID, f.org.id, f.owner.id, ciphertext)
    .run()
}

function rawNote(
  f: ChatFixture,
  sessionId: string,
): Extract<ChatEvent, { type: 'workspace.repository-changed' }> {
  return {
    type: 'workspace.repository-changed',
    sessionId,
    member: {
      id: f.member.id,
      githubLogin: 'teammate',
      displayName: 'Teammate',
      avatarUrl: null,
    },
    repository: { id: 'billing', fullName: 'example/billing' },
    branch: 'feature/fixture-secret',
    baseBranch: 'target/fixture-secret',
  }
}

it('labels a raw repository note before storage after a new capture for an already open tab', async () => {
  const f = await createChatFixture(harness)
  const session = await f.createSession()
  await captureSecret(f, 'earlier-fixture-secret')
  const tab = await f.tab()
  tab.messages.length = 0
  await captureSecret(f)
  const note = rawNote(f, session.id)
  const saved = await f.changeWorkspace(WORKSPACE_ID, async (view) => [
    await view.emit(note),
    await view.emit({ type: 'session.updated', session }),
  ])
  const labeled = {
    ...note,
    displayBranch: 'feature/[redacted]',
    displayBaseBranch: 'target/[redacted]',
  }
  expect.soft(saved[0].event).toEqual(labeled)
  expect.soft(tab.messages).toEqual([
    { type: 'event', envelope: { ...saved[0], event: labeled } },
    { type: 'event', envelope: saved[1] },
  ])
  expect(saved[1].eventNumber).toBe(saved[0].eventNumber + 1)
  expect(
    (await f.actor.api.controls.history(WORKSPACE_ID)).events.slice(-2),
  ).toEqual(saved)
})

it('labels new and replayed repository notes while jobs, receipt keys, and Git commands keep real branches', async () => {
  const f = await repositoryChangeFixture(harness)
  await captureSecret(f, 'earlier-fixture-secret')
  await f.env.DB.prepare('UPDATE workspaces SET name = ? WHERE id = ?')
    .bind('fixture-secret-replay-secret', WORKSPACE_ID)
    .run()
  f.controls.newBase = 'target/fixture-secret-replay-secret'
  const session = await f.createSession()
  const tab = await f.tab()
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected pending change.')
  await f.advanceTo('publish')
  const publish = async () => {
    await f.storage.put('alarm:repository-change', f.clock.now())
    await f.actor.api.controls.dispatchAlarm()
    await f.drain()
  }
  await captureSecret(f)
  await publish()
  const job = await f.storage.get<RepositoryChangeJob>(
    repositoryChangeJobKey(pending.changeId),
  )
  if (!job) throw new Error('Expected saved repository change job.')
  const saved = (await f.actor.api.controls.history(WORKSPACE_ID)).events.find(
    ({ event }) => event.type === 'workspace.repository-changed',
  )
  if (!saved) throw new Error('Expected stored repository change note.')
  const note = {
    ...rawNote(f, session.id),
    member: job.member,
    branch: job.branch,
    baseBranch: 'target/fixture-secret-replay-secret',
  }
  expect(job.request).toEqual({
    expectedRepositoryId: 'repo',
    expectedBranch: 'octocat/test',
    repositoryId: 'billing',
  })
  expect(job.baseBranch).toBe('target/fixture-secret-replay-secret')
  expect(job.branch).toMatch(
    /^[^/]+\/fixture-secret-replay-secret-v2-[a-z0-9]{4}$/,
  )
  expect(
    await f.storage.get(repositoryChangedKey('repo', 'octocat/test')),
  ).toBe(pending.changeId)
  expect(f.detached()[0].command).toContain(
    "'+refs/heads/target/fixture-secret-replay-secret:refs/heads/continue-base'",
  )
  expect(f.detached()[1].command).toContain(`'${job.branch}'`)
  const labeled = {
    ...note,
    displayBranch: job.branch.replace('fixture-secret', '[redacted]'),
    displayBaseBranch: 'target/[redacted]-replay-secret',
  }
  expect.soft(saved.event).toEqual(labeled)
  const notes = () =>
    tab.messages.flatMap((message) =>
      message.type === 'event' &&
      message.envelope.event.type === 'workspace.repository-changed'
        ? [message.envelope]
        : [],
    )
  expect.soft(notes()).toEqual([{ ...saved, event: labeled }])
  tab.messages.length = 0
  await captureSecret(f, 'replay-secret')
  await f.storage.put(REPOSITORY_CHANGE_JOB_KEY, job)
  await publish()
  expect.soft(notes()).toEqual([
    {
      ...saved,
      event: {
        ...note,
        displayBranch: job.branch.replace(
          'fixture-secret-replay-secret',
          '[redacted]-[redacted]',
        ),
        displayBaseBranch: 'target/[redacted]-[redacted]',
      },
    },
  ])
  expect(
    (await f.actor.api.controls.history(WORKSPACE_ID)).events.find(
      ({ event }) => event.type === 'workspace.repository-changed',
    ),
  ).toEqual(saved)
})

it('labels old repository notes in browser history, session pages, and both transcript copies without changing storage', async () => {
  const f = await transcriptFixture(harness)
  const session = await f.createSession()
  const note = rawNote(f, session.id)
  await f.appendWorkspaceEvent(WORKSPACE_ID, note)
  const saved = (await f.actor.api.controls.history(WORKSPACE_ID)).events.at(-1)
  expect(saved?.event).toEqual(note)
  await captureSecret(f)
  await f.restart()
  const tab = await f.tab()
  const expected = {
    ...saved,
    event: {
      ...note,
      displayBranch: 'feature/[redacted]',
      displayBaseBranch: 'target/[redacted]',
    },
  }
  expect
    .soft(
      tab.messages.flatMap((message) =>
        message.type === 'history'
          ? message.history.events.filter(
              ({ event }) => event.type === 'workspace.repository-changed',
            )
          : [],
      ),
    )
    .toEqual([expected])
  const response = await f.fetch(
    chatHistoryPath(
      f.org.id,
      WORKSPACE_ID,
      session.id,
      (saved?.eventNumber ?? 0) + 1,
      saved?.eventNumber,
    ),
  )
  expect(response.status).toBe(200)
  const page: NewestChatHistoryResponse = await response.json()
  expect
    .soft(
      page.events.find(
        ({ event }) => event.type === 'workspace.repository-changed',
      ),
    )
    .toEqual(expected)
  expect(page.throughEventNumber).toBe(saved?.eventNumber)
  for (const detail of ['full', 'concise'] as const) {
    const transcript = await f.fetch(
      sessionTranscriptPath(f.org.id, WORKSPACE_ID, session.id, detail),
    )
    expect(transcript.status).toBe(200)
    const document: { markdown: string } = await transcript.json()
    expect
      .soft(document.markdown)
      .toContain(
        '_Teammate moved the workspace to `example/billing`, on the new branch `feature/[redacted]`_',
      )
  }
  expect(
    (await f.actor.api.controls.history(WORKSPACE_ID)).events.at(-1),
  ).toEqual(saved)
})
