import { describe, expect, it } from 'vitest'
import { fakeMacRequest } from '../../test-support/fixtures/devices'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import type { TranscriptItem } from '../state/transcript'
import { placeCommands } from './placement'

const { message } = workspaceFixtures()
const turn = 'turn-1'
const items: TranscriptItem[] = [
  { kind: 'user', id: 'user:ask', message },
  { kind: 'agent', id: 'agent:plan', turnId: turn, text: 'I asked your Mac.' },
  {
    kind: 'tool',
    id: 'tool:mac',
    turnId: turn,
    tool: {
      id: 'mac',
      kind: 'run',
      target: 'npm run test:safari',
      detail: null,
      omittedDetailBytes: 0,
      state: 'done',
    },
  },
  { kind: 'agent', id: 'agent:passed', turnId: turn, text: 'It passes.' },
  { kind: 'turn-end', id: 'end:turn', turnId: turn, durationMs: 9, files: [] },
  { kind: 'user', id: 'user:next', message: { ...message, id: 'next' } },
]
const times = new Map([
  ['user:ask', 1_000],
  ['agent:plan', 2_000],
  ['tool:mac', 3_000],
  ['agent:passed', 9_000],
  ['end:turn', 10_000],
  ['user:next', 11_000],
])

describe('placeCommands', () => {
  it('places each command after the parts of its turn that came first, and before the end of its turn', () => {
    const requests = [
      fakeMacRequest({
        requestId: 'after-tool',
        turnId: turn,
        createdAt: 3_500,
      }),
      fakeMacRequest({
        requestId: 'same-place',
        turnId: turn,
        createdAt: 3_600,
      }),
      fakeMacRequest({ requestId: 'late', turnId: turn, createdAt: 9_500 }),
      fakeMacRequest({ requestId: 'no-turn', turnId: 'turn-9', createdAt: 1 }),
    ]
    const placed = placeCommands(items, times, requests).map(
      ({ request, after }) => `${request.requestId} after ${after}`,
    )
    expect(placed).toEqual([
      'after-tool after tool:mac',
      'same-place after tool:mac',
      'late after agent:passed',
      'no-turn after user:next',
    ])
  })
})
