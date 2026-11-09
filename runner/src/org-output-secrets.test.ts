import { expect, it, onTestFinished } from 'vitest'

import { turn } from '../test-support/harness'
import { refresh, reportSnapshot } from '../test-support/reports'
import { wireFixture } from '../test-support/wire'
import { configuration } from './config'
import { Runner } from './runner'

it('masks the workspace token before reports and preserves output metadata', async () => {
  const h = await wireFixture(reportSnapshot(['wire-token.production']))
  h.endpoint.confirmEvents = false
  const runner = new Runner({
    ...h.options,
    ...configuration({
      CONDUCTIVE_WORKSPACE_ID: 'workspace-1',
      CONDUCTIVE_WORKSPACE_TOKEN: 'wire-token',
      CONDUCTIVE_RUNNER_URL: h.endpoint.url,
      CONDUCTIVE_REPOSITORY: '/repo',
      CONDUCTIVE_DEFAULT_BRANCH: 'main',
      CONDUCTIVE_HOME: '/home/agent',
    }),
  })
  onTestFinished(() => runner.close())
  await runner.start(false)
  expect(h.endpoint.runnerEvents.map(({ event }) => event)).toEqual([
    {
      type: 'files.snapshot',
      tree: {
        revision: 1,
        partNumber: 1,
        partCount: 1,
        entries: [
          {
            path: 'wire-token.production',
            displayPath: '[redacted].production',
            name: 'file',
            kind: 'file',
            change: 'untracked',
          },
        ],
      },
    },
    {
      type: 'changes.updated',
      changes: {
        revision: 1,
        partNumber: 1,
        partCount: 1,
        baseBranch: 'main',
        unpushedCommits: 0,
        files: [
          {
            path: 'wire-token.production',
            displayPath: '[redacted].production',
            change: 'untracked',
            added: 1,
            removed: 0,
            uncommitted: true,
          },
        ],
        summary: { files: 1, added: 1, removed: 0 },
      },
    },
    { type: 'runner.ready' },
  ])
  h.endpoint.send(turn())
  await runner.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.started',
    sessionId: 'session-1',
    turnId: 'turn-1',
    senderId: 'alice',
    choice: { agent: 'claude', model: 'test-model', effort: 'high' },
    messageIds: ['message-1'],
  })
  const provider = h.providers.latest
  provider.emit({ type: 'delta', messageId: 'answer-a1', text: 'wire-' })
  await runner.idle()
  provider.emit({
    type: 'delta',
    messageId: 'answer-a1',
    text: 'token production a 1',
  })
  provider.emit({
    type: 'answer',
    messageId: 'answer-a1',
    text: 'wire-token production a 1',
    userMessageIds: ['message-1'],
  })
  provider.emit({
    type: 'tool',
    tool: {
      id: 'tool-a1',
      kind: 'read',
      target: 'wire-token production a 1',
      detail: 'wire-token production a 1',
      omittedDetailBytes: 0,
      state: 'done',
    },
  })
  provider.emit({
    type: 'failed',
    code: 'failure-a1',
    message: 'wire-token production a 1',
  })
  await runner.idle()
  const text = '[redacted] production a 1'
  expect(h.endpoint.runnerEvents.slice(4).map(({ event }) => event)).toEqual([
    {
      type: 'assistant.delta',
      sessionId: 'session-1',
      turnId: 'turn-1',
      messageId: 'answer-a1',
      text,
    },
    {
      type: 'assistant.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      messageId: 'answer-a1',
      text,
      userMessageIds: ['message-1'],
    },
    {
      type: 'tool.updated',
      sessionId: 'session-1',
      turnId: 'turn-1',
      tool: {
        id: 'tool-a1',
        kind: 'read',
        target: text,
        detail: text,
        omittedDetailBytes: 0,
        state: 'done',
      },
    },
    {
      type: 'turn.failed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      error: { code: 'failure-a1', message: text },
      retryMessageId: 'message-1',
      durationMs: 0,
    },
  ])
  await runner.link.emit({
    type: 'start.updated',
    start: {
      kind: 'create',
      startedAt: 90,
      steps: [
        {
          id: 'a1',
          label: '[redacted] production',
          state: 'failed',
          startedAt: 90,
          completedAt: 100,
        },
      ],
    },
  })
  await runner.link.emit({
    type: 'workspace.title',
    name: '[redacted] production',
  })
  const retained = h.endpoint.runnerEvents.slice(-2).map(({ event }) => event)
  h.endpoint.send(refresh('start.updated'))
  h.endpoint.send(refresh('workspace.title'))
  await runner.idle()
  expect(h.endpoint.runnerEvents.slice(-2).map(({ event }) => event)).toEqual(
    retained,
  )
  expect(h.warnings).toEqual([])
})
