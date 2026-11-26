import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { ChatEvent } from '../../src/shared/chat-events'
import type { NewestChatHistoryResponse } from '../../src/shared/events'
import { chatHistoryPath } from '../../src/shared/events'
import { sessionTranscriptPath } from '../../src/shared/sessions'
import { orgEnvironmentContext } from '../lifecycle/settings-data'
import { continueFixture } from '../lifecycle/continue.test-support'
import {
  CONTINUE_JOB_KEY,
  continueJobKey,
  type ContinueJob,
} from '../lifecycle/continue-types'
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

async function captureSecret(
  f: ChatFixture,
  values: Record<string, string> = { DUMMY: 'fixture-secret' },
) {
  const ciphertext = await encrypt(
    JSON.stringify(values),
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

it('labels a raw shared publication after a new capture for a tab opened before that capture', async () => {
  const f = await createChatFixture(harness)
  const session = await f.createSession()
  await captureSecret(f, { DUMMY: 'earlier-fixture-secret' })
  const tab = await f.tab()
  tab.messages.length = 0
  await captureSecret(f)
  const rawNote: Extract<ChatEvent, { type: 'workspace.continued' }> = {
    type: 'workspace.continued',
    sessionId: session.id,
    member: {
      id: f.member.id,
      githubLogin: 'teammate',
      displayName: 'Teammate',
      avatarUrl: null,
    },
    branch: 'feature/fixture-secret',
    baseBranch: 'target/fixture-secret',
  }
  const saved = await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    const note = await view.emit(rawNote)
    const updated = await view.emit({ type: 'session.updated', session })
    return [note, updated]
  })
  const labeledNote = {
    ...rawNote,
    displayBranch: 'feature/[redacted]',
    displayBaseBranch: 'target/[redacted]',
  }
  expect(tab.messages).toEqual([
    { type: 'event', envelope: { ...saved[0], event: labeledNote } },
    { type: 'event', envelope: saved[1] },
  ])
  expect(saved[0].event).toEqual(labeledNote)
  expect(saved[1].eventNumber).toBe(saved[0].eventNumber + 1)
  expect(
    (await f.actor.api.controls.history(WORKSPACE_ID)).events.slice(-2),
  ).toEqual(saved)
})

it('labels new and replayed Continue notes while jobs and Git commands keep real branches', async () => {
  const f = await continueFixture(harness)
  await captureSecret(f, { DUMMY: 'earlier-fixture-secret' })
  await f.env.DB.prepare('UPDATE workspaces SET name = ? WHERE id = ?')
    .bind('fixture-secret-replay-secret', WORKSPACE_ID)
    .run()
  f.api.defaultBranch = 'target/fixture-secret-replay-secret'
  f.api.branches.set(
    'refs/heads/target/fixture-secret-replay-secret',
    'latest-default',
  )
  // Continue builds on the branch that the pull request merged into
  // (decision 300), here the default branch.
  f.api.pulls[2].baseRefName = f.api.defaultBranch
  const session = await f.createSession()
  const tab = await f.tab()
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  await f.advanceTo('publish')
  await captureSecret(f)
  const publish = async () => {
    await f.storage.put('alarm:continue', f.clock.now())
    await f.actor.api.controls.dispatchAlarm()
    await f.drain()
  }
  await publish()
  const job = await f.storage.get<ContinueJob>(
    continueJobKey(pending.continueId),
  )
  if (!job) throw new Error('Expected saved Continue job.')
  const saved = (await f.actor.api.controls.history(WORKSPACE_ID)).events.find(
    ({ event }) => event.type === 'workspace.continued',
  )
  if (!saved) throw new Error('Expected stored Continue note.')
  const rawNote = {
    type: 'workspace.continued',
    sessionId: session.id,
    member: job.member,
    branch: job.branch,
    baseBranch: 'target/fixture-secret-replay-secret',
  }
  expect(job.request).toEqual({ expectedBranch: 'octocat/test' })
  expect(job.baseBranch).toBe('target/fixture-secret-replay-secret')
  expect(job.branch).toMatch(
    /^octocat\/fixture-secret-replay-secret-v2-[a-z0-9]{4}$/,
  )
  expect(f.boat.commands.join('\n')).toContain(
    "'+refs/heads/target/fixture-secret-replay-secret:refs/heads/continue-base'",
  )
  expect(f.boat.commands.join('\n')).toContain(`'${job.branch}'`)
  const expectedNote = {
    ...rawNote,
    displayBranch: job.branch.replace('fixture-secret', '[redacted]'),
    displayBaseBranch: 'target/[redacted]-replay-secret',
  }
  expect(saved.event).toEqual(expectedNote)
  const expected = { ...saved, event: expectedNote }
  const notes = () =>
    tab.messages.flatMap((message) =>
      message.type === 'event' &&
      message.envelope.event.type === 'workspace.continued'
        ? [message.envelope]
        : [],
    )
  expect.soft(notes()).toEqual([expected])
  tab.messages.length = 0
  await captureSecret(f, { DUMMY: 'fixture-secret', REPLAY: 'replay-secret' })
  await f.storage.put(CONTINUE_JOB_KEY, job)
  await publish()
  expect.soft(notes()).toEqual([
    {
      ...saved,
      event: {
        ...rawNote,
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
      ({ event }) => event.type === 'workspace.continued',
    ),
  ).toEqual(saved)
})

it('labels old Continue notes in initial history, session pages, and transcript copies without changing stored events', async () => {
  const f = await transcriptFixture(harness)
  const session = await f.createSession()
  const rawNote: Extract<ChatEvent, { type: 'workspace.continued' }> = {
    type: 'workspace.continued',
    sessionId: session.id,
    member: {
      id: f.member.id,
      githubLogin: 'teammate',
      displayName: 'Teammate',
      avatarUrl: null,
    },
    branch: 'feature/fixture-secret',
    baseBranch: 'target/fixture-secret',
  }
  await f.appendWorkspaceEvent(WORKSPACE_ID, rawNote)
  const saved = (await f.actor.api.controls.history(WORKSPACE_ID)).events.at(-1)
  await captureSecret(f)
  await f.restart()
  const tab = await f.tab()
  const expected = {
    ...saved,
    event: {
      ...rawNote,
      displayBranch: 'feature/[redacted]',
      displayBaseBranch: 'target/[redacted]',
    },
  }
  expect
    .soft(
      tab.messages.flatMap((message) =>
        message.type === 'history'
          ? message.history.events.filter(
              ({ event }) => event.type === 'workspace.continued',
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
    .soft(page.events.find(({ event }) => event.type === 'workspace.continued'))
    .toEqual(expected)
  expect(page.throughEventNumber).toBe(saved?.eventNumber)
  const transcript = await f.fetch(
    sessionTranscriptPath(f.org.id, WORKSPACE_ID, session.id, 'full'),
  )
  expect(transcript.status).toBe(200)
  const document: { markdown: string } = await transcript.json()
  expect
    .soft(document.markdown)
    .toContain(
      '_Teammate continued on `feature/[redacted]`, a new branch from `target/[redacted]`_',
    )
  expect(
    (await f.actor.api.controls.history(WORKSPACE_ID)).events.at(-1),
  ).toEqual(saved)
})
