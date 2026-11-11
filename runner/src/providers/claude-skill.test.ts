import { beforeEach, expect, it, onTestFinished } from 'vitest'

import { FakeClaudeQuery } from '../../test-support/claude-query'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { runnerHarness, turn } from '../../test-support/harness'
import { Runner } from '../runner'
import { createClaudeFactory } from './claude'
import { ClaudeEvents } from './claude-events'
import { mapTool } from './tool'
import type { ProviderEvent } from './types'

beforeEach(mockComputerServer)

it('maps Claude Skill names and arguments while leaving unusable names plain', () => {
  const plain = {
    id: 'skill-1',
    kind: 'other',
    target: 'Skill',
    detail: null,
    omittedDetailBytes: 0,
    state: 'running',
  }
  expect(
    mapTool(
      'skill-1',
      'Skill',
      { skill: 'brainstorming', args: 'high' },
      'running',
    ),
  ).toEqual({
    ...plain,
    skills: ['brainstorming'],
    target: 'brainstorming',
    detail: 'high',
  })
  for (const input of [
    { skill: 'conductor:conductor' },
    { skill: 'conductor:conductor', args: '' },
    { skill: 'conductor:conductor', args: 42 },
  ]) {
    expect(
      mapTool('skill-1', 'Skill', input, 'running'),
      JSON.stringify(input),
    ).toEqual({
      ...plain,
      skills: ['conductor:conductor'],
      target: 'conductor:conductor',
    })
  }
  for (const input of [{}, { skill: '' }, { skill: 42 }]) {
    expect(
      mapTool('skill-1', 'Skill', input, 'running'),
      JSON.stringify(input),
    ).toEqual(plain)
  }
})

it('holds a streamed Claude Skill start until its name and completes the skill call', async () => {
  const h = await runnerHarness()
  await h.runner.close()
  const sdk = new FakeClaudeQuery()
  const runner = new Runner({
    ...h.options,
    providers: {
      ...h.options.providers,
      claude: createClaudeFactory(sdk.open, () => '/pinned/claude'),
    },
  })
  onTestFinished(() => runner.close())
  await runner.start(false)
  h.endpoint.send(turn())
  await runner.idle()
  const user = await sdk.nextUser()
  const updates = () =>
    h.endpoint.runnerEvents.flatMap(({ event }) =>
      event.type === 'tool.updated' ? [event] : [],
    )
  await sdk.raw({
    type: 'stream_event',
    event: {
      type: 'content_block_start',
      index: 0,
      content_block: {
        type: 'tool_use',
        id: 'skill-1',
        name: 'Skill',
        input: {},
      },
    },
  })
  await runner.idle()
  expect(updates()).toEqual([])
  await sdk.raw({
    type: 'assistant',
    user_message_uuid: user.uuid,
    message: {
      id: 'skill-message',
      content: [
        {
          type: 'tool_use',
          id: 'skill-1',
          name: 'Skill',
          input: { skill: 'brainstorming', args: 'high' },
        },
      ],
    },
  })
  await runner.idle()
  const running = {
    type: 'tool.updated',
    sessionId: 'session-1',
    turnId: 'turn-1',
    tool: {
      id: 'skill-1',
      kind: 'other',
      skills: ['brainstorming'],
      target: 'brainstorming',
      detail: 'high',
      omittedDetailBytes: 0,
      state: 'running',
    },
  }
  expect(updates()).toEqual([running])
  await sdk.raw({
    type: 'user',
    message: {
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'skill-1',
          content: 'Launching skill: brainstorming',
        },
      ],
    },
  })
  await sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuid: user.uuid,
  })
  await runner.idle()
  expect(updates()).toEqual([
    running,
    { ...running, tool: { ...running.tool, state: 'done' } },
  ])
})

it('keeps a forked Claude Skill running until its own failed result', () => {
  const events: ProviderEvent[] = []
  const mapper = new ClaudeEvents(
    new Map(),
    (event) => events.push(event),
    () => false,
  )
  const frame = {
    type: 'assistant',
    message: {
      id: 'fork-message',
      content: [
        {
          type: 'tool_use',
          id: 'fork-skill',
          name: 'Skill',
          input: { skill: 'conductor:conductor' },
        },
      ],
    },
  }
  mapper.accept(frame)
  mapper.accept({ ...frame, parent_tool_use_id: 'fork-skill' })
  mapper.accept({
    type: 'user',
    parent_tool_use_id: 'fork-skill',
    message: {
      content: [{ type: 'tool_result', tool_use_id: 'fork-skill' }],
    },
  })
  const running = {
    type: 'tool',
    tool: {
      id: 'fork-skill',
      kind: 'other',
      skills: ['conductor:conductor'],
      target: 'conductor:conductor',
      detail: null,
      omittedDetailBytes: 0,
      state: 'running',
    },
  }
  expect(events).toEqual([running])
  mapper.accept({
    type: 'user',
    message: {
      content: [
        { type: 'tool_result', tool_use_id: 'fork-skill', is_error: true },
      ],
    },
  })
  expect(events).toEqual([
    running,
    { ...running, tool: { ...running.tool, state: 'failed' } },
  ])
})

it('ends an unnamed Claude Skill call as a plain tool without a running event', () => {
  for (const input of [{}, { skill: '' }, { skill: 42 }]) {
    const events: ProviderEvent[] = []
    const mapper = new ClaudeEvents(
      new Map(),
      (event) => events.push(event),
      () => false,
    )
    mapper.accept({
      type: 'assistant',
      message: {
        id: 'unnamed-message',
        content: [{ type: 'tool_use', id: 'unnamed', name: 'Skill', input }],
      },
    })
    expect(events, JSON.stringify(input)).toEqual([])
    mapper.accept({
      type: 'user',
      message: {
        content: [{ type: 'tool_result', tool_use_id: 'unnamed' }],
      },
    })
    expect(events, JSON.stringify(input)).toEqual([
      {
        type: 'tool',
        tool: {
          id: 'unnamed',
          kind: 'other',
          target: 'Skill',
          detail: null,
          omittedDetailBytes: 0,
          state: 'done',
        },
      },
    ])
  }
})
