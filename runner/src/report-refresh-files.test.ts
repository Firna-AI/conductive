import { expect, it } from 'vitest'

import { turn } from '../test-support/harness'
import { refresh, reportSnapshot } from '../test-support/reports'
import { wireFixture } from '../test-support/wire'
import { parseWorkspaceMessage } from './commands'

it('accepts every report refresh kind without a session or login', () => {
  const commands = [
    refresh('files.snapshot'),
    refresh('changes.updated'),
    refresh('start.updated'),
    refresh('workspace.title'),
    refresh('ports.updated'),
  ]
  const parsed: unknown[] = []
  expect(() => {
    for (const command of commands)
      parsed.push(
        parseWorkspaceMessage(JSON.parse(JSON.stringify(command)), () => {}),
      )
  }).not.toThrow()
  expect(parsed).toEqual(commands)
})

it('refreshes only the requested file kind without hiding later monitor updates', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  h.setSnapshot(reportSnapshot(['first']))
  h.endpoint.send(refresh('files.snapshot'))
  await h.runner.idle()
  expect(h.endpoint.runnerEvents.slice(3).map(({ event }) => event)).toEqual([
    {
      type: 'files.snapshot',
      tree: {
        revision: 2,
        partNumber: 1,
        partCount: 1,
        entries: [
          { path: 'first', name: 'file', kind: 'file', change: 'untracked' },
        ],
      },
    },
  ])
  await h.runner.files.refresh()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toEqual({
    type: 'changes.updated',
    changes: {
      revision: 2,
      partNumber: 1,
      partCount: 1,
      baseBranch: 'main',
      files: [
        {
          path: 'first',
          change: 'untracked',
          added: 1,
          removed: 0,
          uncommitted: true,
        },
      ],
      summary: { files: 1, added: 1, removed: 0 },
    },
  })
  const before = h.endpoint.runnerEvents.length
  h.setSnapshot(reportSnapshot(['second']))
  h.endpoint.send(refresh('changes.updated'))
  await h.runner.idle()
  expect(
    h.endpoint.runnerEvents.slice(before).map(({ event }) => event),
  ).toEqual([
    {
      type: 'changes.updated',
      changes: {
        revision: 3,
        partNumber: 1,
        partCount: 1,
        baseBranch: 'main',
        files: [
          {
            path: 'second',
            change: 'untracked',
            added: 1,
            removed: 0,
            uncommitted: true,
          },
        ],
        summary: { files: 1, added: 1, removed: 0 },
      },
    },
  ])
  await h.runner.files.refresh()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toEqual({
    type: 'files.changed',
    delta: {
      revision: 3,
      changes: [
        { operation: 'remove', path: 'first' },
        {
          operation: 'upsert',
          entry: {
            path: 'second',
            name: 'file',
            kind: 'file',
            change: 'untracked',
          },
        },
      ],
    },
  })
  expect(h.store.snapshot.fileRevisions).toEqual({ tree: 3, changes: 3 })
  expect(h.warnings).toEqual([])
})

it('answers a refresh during an active turn and keeps the same agent input', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  h.endpoint.send(turn())
  await h.runner.idle()
  h.endpoint.send(refresh('files.snapshot'))
  h.endpoint.send(refresh('files.snapshot'))
  await h.runner.idle()
  expect(h.endpoint.runnerEvents.map(({ event }) => event.type)).toEqual([
    'files.snapshot',
    'changes.updated',
    'runner.ready',
    'turn.started',
    'files.snapshot',
  ])
  expect(h.endpoint.runnerEvents.at(-1)?.event).toEqual({
    type: 'files.snapshot',
    tree: { revision: 2, partNumber: 1, partCount: 1, entries: [] },
  })
  expect(h.providers.processes).toHaveLength(1)
  expect(h.providers.latest.messages.map((input) => input.message.id)).toEqual([
    'message-1',
  ])
  h.providers.latest.emit({
    type: 'answer',
    messageId: 'reply',
    text: 'The turn continues.',
    userMessageIds: ['message-1'],
  })
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1'],
  })
  await h.runner.idle()
  expect(
    h.endpoint.runnerEvents.slice(-2).map(({ event }) => event.type),
  ).toEqual(['assistant.completed', 'turn.completed'])
  expect(h.warnings).toEqual([])
})
