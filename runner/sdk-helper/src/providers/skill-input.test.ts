import { join } from 'node:path'

import { beforeEach, expect, it, onTestFinished } from 'vitest'

import { FakeAppServers } from '../../test-support/app-server'
import { FakeClaudeQuery } from '../../test-support/claude-query'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { providerFixture } from '../../test-support/fixture'
import { duringTurn, turn } from '../../test-support/input'
import type { HelperOutput } from '../generated/HelperOutput'
import type { HelperRequest } from '../generated/HelperRequest'
import { readRequest } from '../read-request'
import { HelperSession } from '../session'
import { createClaudeFactory } from './claude'
import { createCodexFactory } from './codex'
import { writeCodexCredentials } from './codex-credentials'
import { SkillInputs } from './skill-input'

beforeEach(mockComputerServer)

function inputOf(servers: FakeAppServers, method: string): unknown {
  const params = servers.latest.writes.findLast(
    (write) => write.method === method,
  )?.params
  return params && typeof params === 'object' && 'input' in params
    ? params.input
    : undefined
}

it('gives Codex unchanged text and distinct listed skills for starts and messages during a turn', async () => {
  const h = await providerFixture('codex')
  const servers = new FakeAppServers()
  const skills = new SkillInputs()
  const path = (name: string) =>
    join(h.root, '.agents/skills', name, 'SKILL.md')
  const pending = new Map<string, (output: HelperOutput) => void>()
  const session = new HelperSession(
    {
      claude: createClaudeFactory(),
      codex: createCodexFactory(servers.start, writeCodexCredentials, skills),
    },
    (output) => {
      if (output.type === 'response' || output.type === 'error') {
        pending.get(output.requestId)?.(output)
        pending.delete(output.requestId)
      }
    },
    async () => {},
    () => {},
    skills,
  )
  const request = (input: HelperRequest) =>
    new Promise<HelperOutput>((resolve) => {
      pending.set(input.requestId, resolve)
      session.accept(readRequest(input))
    })
  onTestFinished(() => session.close())
  await request({
    type: 'start',
    requestId: 'start',
    options: { ...h.options, backgroundNoteIds: [] },
  })
  h.command.message.text = '/plans then /unknown, `/review`, and /plans again'
  await request({
    type: 'send',
    requestId: 'first',
    input: h.command,
    skills: [
      { name: 'plans', path: path('plans') },
      { name: 'review', path: path('review') },
    ],
  })
  expect(inputOf(servers, 'turn/start')).toEqual([
    {
      type: 'text',
      text: 'Sender: @alice [member ID: "alice"]\n\n/plans then /unknown, `/review`, and /plans again',
      text_elements: [],
    },
    { type: 'skill', name: 'plans', path: path('plans') },
  ])
  const second = duringTurn(turn('2', 'alice', 'codex'))
  second.message.text = 'Also\n/review it with /plans'
  await request({
    type: 'send',
    requestId: 'second',
    input: second,
    skills: [
      { name: 'review', path: path('review') },
      { name: 'plans', path: '/new/plans/SKILL.md' },
    ],
  })
  expect(inputOf(servers, 'turn/steer')).toEqual([
    {
      type: 'text',
      text: 'Sender: @alice [member ID: "alice"]\n\nAlso\n/review it with /plans',
      text_elements: [],
    },
    { type: 'skill', name: 'review', path: path('review') },
    { type: 'skill', name: 'plans', path: '/new/plans/SKILL.md' },
  ])
})

it('gives Claude the stored text of a message that names a skill', async () => {
  const h = await providerFixture()
  const sdk = new FakeClaudeQuery()
  const provider = await createClaudeFactory(
    sdk.open,
    () => '/pinned/claude',
  )(h.options)
  onTestFinished(() => provider.close())
  h.command.message.text = '/plans for the next step'
  await provider.send(h.command)
  expect((await sdk.nextUser()).message.content).toBe(
    'Sender: @alice [member ID: "alice"]\n\n/plans for the next step',
  )
})
