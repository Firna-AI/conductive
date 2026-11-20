import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { beforeEach, expect, it, onTestFinished } from 'vitest'

import { FakeAppServers } from '../../test-support/app-server'
import { FakeClaudeQuery } from '../../test-support/claude-query'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { providerFixture } from '../../test-support/fixture'
import { duringTurn, turn } from '../../test-support/input'
import { skillText } from '../../test-support/skills'
import type { HelperOutput } from '../generated/HelperOutput'
import type { HelperRequest } from '../generated/HelperRequest'
import { readRequest } from '../read-request'
import { HelperSession } from '../session'
import { createClaudeFactory } from './claude'
import { createCodexFactory } from './codex'
import { writeCodexCredentials } from './codex-credentials'
import { SkillInputs } from './skill-input'

beforeEach(mockComputerServer)

const sender = 'Sender: @alice [member ID: "alice"]'

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
      text: '/plans then /unknown, `/review`, and /plans again',
      text_elements: [],
    },
    { type: 'skill', name: 'plans', path: path('plans') },
    { type: 'text', text: sender, text_elements: [] },
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
    { type: 'text', text: 'Also\n/review it with /plans', text_elements: [] },
    { type: 'skill', name: 'review', path: path('review') },
    { type: 'skill', name: 'plans', path: '/new/plans/SKILL.md' },
    { type: 'text', text: sender, text_elements: [] },
  ])
})

it('ends a Claude message with its sender line, but starts it with that line when the text starts with a / word that is not a listed Claude skill', async () => {
  const h = await providerFixture()
  const folder = join(h.root, '.claude/skills/plan-files')
  await mkdir(folder, { recursive: true })
  await writeFile(
    join(folder, 'SKILL.md'),
    skillText({
      name: 'plans',
      description: 'Write a plan.',
      'disable-model-invocation': 'true',
    }),
  )
  const sdk = new FakeClaudeQuery()
  const provider = await createClaudeFactory(
    sdk.open,
    () => '/pinned/claude',
  )(h.options)
  onTestFinished(() => provider.close())
  const texts = [
    '/plans for the next step',
    'Use /plans now',
    '/plan-files',
    '/context',
    '/tmp/a.txt is missing',
  ]
  const contents: unknown[] = []
  for (const [index, text] of texts.entries()) {
    const message = index === 0 ? h.command : duringTurn(turn(`${index}`))
    message.message.text = text
    await provider.send(message)
    contents.push((await sdk.nextUser()).message.content)
  }
  expect(contents).toEqual([
    `/plans for the next step\n\n${sender}`,
    `Use /plans now\n\n${sender}`,
    `${sender}\n\n/plan-files`,
    `${sender}\n\n/context`,
    `${sender}\n\n/tmp/a.txt is missing`,
  ])
})
