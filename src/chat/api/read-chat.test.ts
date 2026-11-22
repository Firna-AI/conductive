import { expect, it } from 'vitest'
import type { RunnerEventRefused } from '../../shared/chat-events'
import type { SessionWatchNotice } from '../../shared/generated/SessionWatchNotice'
import {
  senderSnapshot,
  workspaceFixtures,
} from '../../test-support/fixtures/workspaces'
import { readEnvelope } from './read-workspace'

const turn = { sessionId: 'session-1', turnId: 'turn-1' }
const tool = {
  ...turn,
  type: 'tool.updated',
  tool: {
    id: 'test-output',
    kind: 'run',
    target: 'npm test',
    detail: 'One result 🙂',
    omittedDetailBytes: 8,
    state: 'done',
  },
}
const completed = {
  ...turn,
  type: 'turn.completed',
  state: 'stopped',
  durationMs: 25,
  files: [],
  omittedFileCount: 3,
  userMessageIds: [],
}
const marker: RunnerEventRefused = {
  ...turn,
  type: 'runner.event-refused',
  streamId: 'runner-stream',
  runnerEventNumber: 7,
  runnerEventType: 'tool.updated',
  reason: 'too_large',
}

const notice: SessionWatchNotice = {
  type: 'session.watch-notice',
  watchId: 'watch-1',
  messageId: 'session-watch:watch-1',
  sessionId: 'session-1',
  turnId: 'turn-2',
  watchedWorkspaceId: 'workspace-2',
  watchedSession: {
    id: 'debounce',
    link: 'https://app.example/orgs/acme/workspaces/workspace-2/sessions/debounce',
  },
  watchedTurnId: 'debounce-turn',
  state: 'finished',
  reason: null,
}

function envelope(event: unknown) {
  return { workspaceId: 'workspace-1', eventNumber: 9, occurredAt: 25, event }
}

it('preserves the complete Continue note in browser history without changing its member or branches', () => {
  const { workspace } = workspaceFixtures().created
  const event = {
    type: 'workspace.continued',
    sessionId: 'session-1',
    member: senderSnapshot(workspace.owner),
    branch: 'owner/next',
    baseBranch: 'trunk',
  }
  expect(readEnvelope(envelope(event))).toEqual({
    ...envelope(event),
    late: false,
  })
})

it('keeps the label of each branch of a Continue note, and reads a note without a text label as before', () => {
  const { workspace } = workspaceFixtures().created
  const event = {
    type: 'workspace.continued',
    sessionId: 'session-1',
    member: senderSnapshot(workspace.owner),
    branch: 'owner/next-acme-7f3k',
    baseBranch: 'develop/acme-7f3k',
  }
  const labelled = {
    ...event,
    displayBranch: 'owner/next-[redacted]',
    displayBaseBranch: 'develop/[redacted]',
  }
  const read = (value: unknown) => readEnvelope(envelope(value)).event
  expect([
    read(labelled),
    read({ ...event, displayBranch: 7, displayBaseBranch: '' }),
  ]).toEqual([labelled, event])
})

it('reads exact positive omission counts from browser event envelopes', () => {
  for (const event of [tool, completed]) {
    expect(readEnvelope(envelope(event))).toEqual({
      ...envelope(event),
      late: false,
    })
  }
})

it('keeps repository note labels and ignores missing or unreadable optional labels', () => {
  const { workspace } = workspaceFixtures().created
  const event = {
    type: 'workspace.repository-changed',
    sessionId: 'session-1',
    member: senderSnapshot(workspace.owner),
    repository: { id: 'billing', fullName: 'example/billing' },
    branch: 'owner/next-acme-7f3k',
    baseBranch: 'develop/acme-7f3k',
  }
  const labeled = {
    ...event,
    displayBranch: 'owner/next-[redacted]',
    displayBaseBranch: 'develop/[redacted]',
  }
  const read = (value: unknown) => readEnvelope(envelope(value)).event
  expect([
    read(labeled),
    read(event),
    read({ ...event, displayBranch: 7, displayBaseBranch: '' }),
  ]).toEqual([labeled, event, event])
})

it('keeps a known optional end reason and reads older or unknown reasons without it', () => {
  const event = { ...completed, state: 'finished' }
  const ended = { ...event, endReason: 'background_work_limit' }
  expect(readEnvelope(envelope(ended)).event).toEqual(ended)
  for (const endReason of [undefined, 'future_reason', null, false]) {
    expect(readEnvelope(envelope({ ...event, endReason })).event).toEqual(event)
  }
})

it('reads the wake of a watch, and keeps it without an end reason that this app does not know', () => {
  const ended: SessionWatchNotice = {
    ...notice,
    state: 'stopped',
    reason: 'background_work_limit',
  }
  expect(readEnvelope(envelope(notice))).toEqual({
    ...envelope(notice),
    late: false,
  })
  expect(readEnvelope(envelope(ended)).event).toEqual(ended)
  for (const reason of ['future_reason', undefined, false]) {
    expect(readEnvelope(envelope({ ...ended, reason })).event).toEqual({
      ...ended,
      reason: null,
    })
  }
})

it('keeps the speed of a fast turn, and reads an end with no speed or an unreadable one without it', () => {
  const event = { ...completed, state: 'finished' }
  const read = (speed: unknown) =>
    readEnvelope(envelope({ ...event, speed })).event
  const kept = [
    { state: 'fast' },
    { state: 'standard' },
    { state: 'standard', cause: 'fast_limit' },
    { state: 'standard', cause: 'out_of_credits' },
  ]
  const dropped = [
    undefined,
    null,
    'standard',
    { state: 'slow' },
    { state: 'standard', cause: 'Fast limit reached' },
  ]
  expect({ kept: kept.map(read), dropped: dropped.map(read) }).toEqual({
    kept: kept.map((speed) => ({ ...event, speed })),
    dropped: dropped.map(() => event),
  })
})

it('reads a workspace with no name, as a new workspace has until its title comes', () => {
  const { workspace } = workspaceFixtures().created
  const owner = senderSnapshot(workspace.owner)
  const event = {
    type: 'workspace.updated',
    workspace: { ...workspace, owner, name: null },
  }
  expect(readEnvelope(envelope(event))).toEqual({
    ...envelope(event),
    late: false,
  })
})

it('keeps the label of each changed file of a turn, and reads a file without a text label as before', () => {
  const file = {
    path: 'scripts/seed-acme-7f3k.sql',
    change: 'renamed',
    added: 6,
    removed: 0,
  }
  const labelled = {
    ...file,
    displayPath: 'scripts/seed-[redacted].sql',
    previousPath: 'seed-acme-7f3k.sql',
    previousDisplayPath: 'seed-[redacted].sql',
  }
  const read = (files: unknown[]) =>
    readEnvelope(envelope({ ...completed, files })).event
  expect([
    read([labelled]),
    read([{ ...file, displayPath: 7, previousDisplayPath: '' }]),
  ]).toEqual([
    { ...completed, files: [labelled] },
    { ...completed, files: [file] },
  ])
})

it('keeps the late mark of the workspace, and only the value true', () => {
  const marked = (late: unknown) => ({ ...envelope(tool), late })
  expect(readEnvelope(marked(true))).toEqual({ ...envelope(tool), late: true })
  for (const value of [false, 'true', 1, null]) {
    expect(readEnvelope(marked(value)).late).toBe(false)
  }
})

it('reads refusal markers with nullable session and turn context', () => {
  const markers: readonly RunnerEventRefused[] = [
    marker,
    {
      ...marker,
      turnId: null,
      runnerEventType: 'turn.completed',
      reason: 'turn_not_active',
    },
    {
      ...marker,
      sessionId: null,
      turnId: null,
      runnerEventType: 'unknown',
      reason: 'invalid',
    },
  ]
  for (const event of markers) {
    expect(readEnvelope(envelope(event))).toEqual({
      ...envelope(event),
      late: false,
    })
  }
})

it('keeps events with missing or invalid new fields unreadable', () => {
  const unreadable: readonly unknown[] = [
    { ...tool, tool: { ...tool.tool, omittedDetailBytes: undefined } },
    { ...completed, omittedFileCount: undefined },
    ...[-1, 0.5, Number.MAX_SAFE_INTEGER + 1].flatMap((value) => [
      { ...tool, tool: { ...tool.tool, omittedDetailBytes: value } },
      { ...completed, omittedFileCount: value },
    ]),
    { ...marker, runnerEventNumber: 0 },
    { ...marker, runnerEventNumber: undefined },
    { ...marker, streamId: undefined },
    { ...marker, runnerEventType: 'sdk.output' },
    { ...marker, reason: 'other' },
    { ...marker, sessionId: undefined },
    { ...marker, turnId: undefined },
    { ...notice, state: 'cancelled' },
    { ...notice, messageId: undefined },
    { ...notice, watchedSession: { id: 'debounce' } },
  ]
  for (const event of unreadable) {
    expect(readEnvelope(envelope(event)).event).toBeNull()
  }
})
