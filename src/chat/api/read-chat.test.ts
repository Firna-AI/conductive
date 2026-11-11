import { expect, it } from 'vitest'
import type { RunnerEventRefused } from '../../shared/chat-events'
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

it('reads exact positive omission counts from browser event envelopes', () => {
  for (const event of [tool, completed]) {
    expect(readEnvelope(envelope(event))).toEqual({
      ...envelope(event),
      late: false,
    })
  }
})

it('keeps skill names in their given order in browser event envelopes', () => {
  const event = {
    ...tool,
    tool: { ...tool.tool, skills: ['conductor:conductor', 'plans'] },
  }
  expect(readEnvelope(envelope(event)).event).toEqual({
    ...tool,
    tool: { ...tool.tool, skills: ['conductor:conductor', 'plans'] },
  })
})

it('ignores malformed skill values without making a browser event unreadable', () => {
  const read = (skills: unknown) =>
    readEnvelope(envelope({ ...tool, tool: { ...tool.tool, skills } })).event
  expect(read(['', 7, ' plans ', null, 'brainstorming'])).toEqual({
    ...tool,
    tool: { ...tool.tool, skills: [' plans ', 'brainstorming'] },
  })
  for (const skills of ['plans', null, {}, [], ['', 7, null], undefined]) {
    expect(read(skills)).toEqual(tool)
  }
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
  ]
  for (const event of unreadable) {
    expect(readEnvelope(envelope(event)).event).toBeNull()
  }
})
