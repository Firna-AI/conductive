import { join } from 'node:path'

import { beforeEach, expect, it, onTestFinished } from 'vitest'

import { FakeAppServers } from '../../test-support/app-server'
import { FakeClaudeQuery } from '../../test-support/claude-query'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { duringTurn, runnerHarness, turn } from '../../test-support/harness'
import { codexServers, skillText } from '../../test-support/skills'
import { Runner } from '../runner'
import { SkillLists } from '../skills'
import { createClaudeFactory } from './claude'
import { createCodexFactory } from './codex'
import { writeCodexCredentials } from './codex-credentials'

beforeEach(mockComputerServer)

/**
 * A runner whose skills report scans the folders of both agents. The Codex
 * app server of the report gives no list, so the Codex list comes from the
 * scan of the Codex folders.
 */
async function skillRunner() {
  const lists = new SkillLists()
  const h = await runnerHarness(
    async (repository) => {
      const write = (path: string, description: string) =>
        repository.write(path, skillText({ description }))
      await write('.claude/skills/plans/SKILL.md', 'Write plans.')
      await write('.agents/skills/plans/SKILL.md', 'Write plans.')
      await write('.codex/skills/review/SKILL.md', 'Review a change.')
    },
    { skills: { lists, start: codexServers(null).start, timeoutMs: 1 } },
  )
  await h.runner.close()
  const servers = new FakeAppServers()
  const sdk = new FakeClaudeQuery()
  const runner = new Runner({
    ...h.options,
    providers: {
      claude: createClaudeFactory(sdk.open, () => '/pinned/claude'),
      codex: createCodexFactory(servers.start, writeCodexCredentials, lists),
    },
  })
  onTestFinished(() => runner.close())
  await runner.start(false)
  return { h, runner, servers, sdk }
}

function inputOf(servers: FakeAppServers, method: string): unknown {
  const params = servers.latest.writes.findLast(
    (write) => write.method === method,
  )?.params
  return params && typeof params === 'object' && 'input' in params
    ? params.input
    : undefined
}

it('gives Codex the stored text and one skill input for each listed skill that it names, also during a turn', async () => {
  const { h, runner, servers } = await skillRunner()
  const first = turn('1', 'alice', 'codex')
  first.message.text = '/plans then /unknown, `/review`, and /plans again'
  h.endpoint.send(first)
  await runner.idle()
  const skill = (name: string, ...folders: string[]) => ({
    type: 'skill',
    name,
    path: join(h.root, ...folders, 'skills', name, 'SKILL.md'),
  })
  expect(inputOf(servers, 'turn/start')).toEqual([
    {
      type: 'text',
      text: 'Sender: @alice [member ID: "alice"]\n\n/plans then /unknown, `/review`, and /plans again',
      text_elements: [],
    },
    skill('plans', '.agents'),
  ])
  const second = turn('2', 'alice', 'codex')
  second.message.text = 'Also\n/review it with /plans'
  h.endpoint.send({ ...duringTurn(second), turnId: 'turn-1' })
  await runner.idle()
  expect(inputOf(servers, 'turn/steer')).toEqual([
    {
      type: 'text',
      text: 'Sender: @alice [member ID: "alice"]\n\nAlso\n/review it with /plans',
      text_elements: [],
    },
    skill('review', '.codex'),
    skill('plans', '.agents'),
  ])
})

it('gives Claude the stored text of a message that names a skill', async () => {
  const { h, runner, sdk } = await skillRunner()
  const command = turn('1', 'alice', 'claude')
  command.message.text = '/plans for the next step'
  h.endpoint.send(command)
  await runner.idle()
  expect((await sdk.nextUser()).message.content).toBe(
    'Sender: @alice [member ID: "alice"]\n\n/plans for the next step',
  )
})
