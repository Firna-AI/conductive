import { spawn } from 'node:child_process'

import { afterEach, expect, it, vi } from 'vitest'

import { runnerHarness, turn } from '../test-support/harness'
import { FakeTitles, titleQuery } from '../test-support/titles'
import { createClaudeTitle } from './providers/claude-title'

vi.mock('node:child_process', async (original) => ({
  ...(await original<typeof import('node:child_process')>()),
  spawn: vi.fn(),
}))

afterEach(() => vi.restoreAllMocks())

it('titles the first Claude turn through its private login and a hidden query', async () => {
  const q = titleQuery()
  const login: string[] = []
  q.child.stdio[3]?.on('data', (bytes: Buffer) => login.push(bytes.toString()))
  vi.mocked(spawn).mockReturnValue(q.child)
  const titles = new FakeTitles()
  const h = await runnerHarness({
    titles: {
      ...titles.agents,
      claude: createClaudeTitle(q.start, () => '/pinned/claude'),
    },
  })
  const command = turn()
  command.message.text = 'Fix the login route.'
  command.attachments = [{ attachmentId: 'file', path: '/private/image.png' }]
  void q.sdk.raw({
    type: 'result',
    subtype: 'success',
    is_error: false,
    result: '\n## **Title: "Fix secret-alice login route."**\nOther words',
  })
  h.endpoint.send(command)
  await h.runner.idle()
  expect(
    h.endpoint.runnerEvents
      .filter(({ event }) => event.type === 'workspace.title')
      .map(({ event }) => event),
  ).toEqual([{ type: 'workspace.title', name: 'Fix [redacted] login route' }])
  expect(q.sdk.parameters?.options).toMatchObject({
    model: 'test-model',
    thinking: { type: 'disabled' },
    tools: [],
    mcpServers: {},
    settingSources: [],
    persistSession: false,
    maxTurns: 1,
    pathToClaudeCodeExecutable: '/pinned/claude',
  })
  expect(q.sdk.parameters?.prompt).toContain('Fix the login route.')
  expect(q.sdk.parameters?.prompt).not.toContain('/private/image.png')
  expect(login).toEqual(['secret-alice\n'])
  expect(JSON.stringify(vi.mocked(spawn).mock.calls)).not.toContain(
    'secret-alice',
  )
  expect(q.child.signals).toEqual(['SIGTERM'])
  expect(q.sdk.closed).toBe(true)
  expect(h.store.snapshot.reports.latest['workspace.title']).toEqual({
    type: 'workspace.title',
    name: 'Fix [redacted] login route',
  })
  expect(
    h.endpoint.runnerEvents.filter(
      ({ event }) => event.type === 'assistant.completed',
    ),
  ).toEqual([])
  expect(h.warnings).toEqual([])
})
