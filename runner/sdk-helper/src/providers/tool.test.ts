import { expect, it } from 'vitest'

import { ClaudeEvents } from './claude-events'
import { codexNotification } from './codex-events'
import { mapTool } from './tool'
import type { ProviderEvent } from '../generated/ProviderEvent'

const windowRead = { window_id: 7, query: 'menu' }

function claudeCall(): ProviderEvent[] {
  const events: ProviderEvent[] = []
  const mapper = new ClaudeEvents(
    new Map(),
    (event) => events.push(event),
    () => false,
  )
  mapper.accept({
    type: 'assistant',
    message: {
      id: 'message',
      content: [
        {
          type: 'tool_use',
          id: 'call',
          name: 'mcp__computer__get_window_state',
          input: windowRead,
        },
      ],
    },
  })
  return events
}

function codexCall(): ProviderEvent[] {
  const events: ProviderEvent[] = []
  codexNotification(
    'item/started',
    {
      item: {
        type: 'mcpToolCall',
        id: 'call',
        server: 'computer',
        tool: 'get_window_state',
        arguments: windowRead,
        status: 'inProgress',
      },
    },
    [],
    (event) => events.push(event),
  )
  return events
}

it.each([
  ['Claude', claudeCall],
  ['Codex', codexCall],
])(
  'shows a %s MCP tool by its name without the server, with its subject as the detail',
  (_, call) => {
    expect(call()).toEqual([
      {
        type: 'tool',
        tool: {
          id: 'call',
          kind: 'computer',
          target: 'get_window_state',
          detail: 'menu',
          omittedDetailBytes: 0,
          state: 'running',
        },
      },
    ])
  },
)

it('shows the Claude Skill tool by its name, with the skill as the detail', () => {
  expect(
    mapTool('call', 'Skill', { skill: 'brainstorming', args: 'x' }, 'done'),
  ).toEqual({
    id: 'call',
    kind: 'other',
    target: 'Skill',
    detail: 'brainstorming',
    omittedDetailBytes: 0,
    state: 'done',
  })
})

it.each([
  ['no arguments', {}],
  ['other arguments', { path: 'brainstorming/SKILL.md', description: 'Plan' }],
])('shows the Claude Skill tool by its name alone with %s', (_, input) => {
  expect(mapTool('call', 'Skill', input, 'failed')).toMatchObject({
    target: 'Skill',
    detail: null,
  })
})

it.each([
  [
    'an address',
    'WebFetch',
    { url: 'https://a.test', skill: 'x' },
    'https://a.test',
  ],
  [
    'a description',
    'Agent',
    { description: 'Find tests', prompt: 'p' },
    'Find tests',
  ],
  ['no subject', 'ExitPlanMode', { plan: 'p' }, null],
])(
  'shows a tool of the kind other by its name, with %s as the detail',
  (_, name, input, detail) => {
    expect(mapTool('call', name, input, 'done')).toMatchObject({
      kind: 'other',
      target: name,
      detail,
    })
  },
)

it('keeps the subject as the target of a tool whose verb names its kind', () => {
  expect(
    mapTool('call', 'Read', { file_path: 'a.ts', description: 'd' }, 'done'),
  ).toMatchObject({ kind: 'read', target: 'a.ts', detail: 'd' })
})
