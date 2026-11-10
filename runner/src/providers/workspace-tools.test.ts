import { beforeEach, expect, it, onTestFinished, vi } from 'vitest'

import { FakeAppServers } from '../../test-support/app-server'
import { FakeClaudeQuery } from '../../test-support/claude-query'
import {
  fakeComputerServer,
  mockComputerServer,
} from '../../test-support/computer-mcp'
import { duringTurn, runnerHarness, turn } from '../../test-support/harness'
import { stop } from '../../test-support/runtime'
import { Runner } from '../runner'
import { createClaudeFactory } from './claude'
import { createCodexFactory } from './codex'

beforeEach(mockComputerServer)

it.each(['claude', 'codex'] as const)(
  'registers workspace tools for %s with fresh active turn context and no login in its environment',
  async (agent) => {
    const h = await runnerHarness()
    await h.runner.close()
    for (const name of [
      'CONDUCTIVE_MACHINE_ORIGIN',
      'CONDUCTIVE_WORKSPACE_TOKEN',
      'CONDUCTIVE_TURN_ID',
    ])
      vi.stubEnv(name, 'stale-inherited-context')
    onTestFinished(() => {
      vi.unstubAllEnvs()
    })
    const queries: FakeClaudeQuery[] = []
    const servers = new FakeAppServers()
    const runner = new Runner({
      ...h.options,
      providers: {
        claude: createClaudeFactory(
          (parameters) => {
            const sdk = new FakeClaudeQuery()
            queries.push(sdk)
            return sdk.open(parameters)
          },
          () => '/pinned/claude',
        ),
        codex: createCodexFactory(servers.start),
      },
    })
    onTestFinished(() => runner.close())
    await runner.start(false)
    const first = turn('first', 'alice', agent)
    h.endpoint.send(first)
    await runner.idle()
    const environment = () =>
      agent === 'claude'
        ? queries.at(-1)?.parameters?.options?.env
        : servers.requests.at(-1)?.env
    const registration = () =>
      agent === 'claude'
        ? queries.at(-1)?.parameters?.options?.mcpServers
        : servers.requests
            .at(-1)
            ?.args.filter((value) => value.startsWith('mcp_servers.'))
    const check = (turnId: string) => {
      expect(environment()).toMatchObject({
        CONDUCTIVE_MACHINE_ORIGIN: 'https://machines.conductive.test',
        CONDUCTIVE_WORKSPACE_TOKEN: 'workspace-secret',
        CONDUCTIVE_TURN_ID: turnId,
      })
      expect(environment()).not.toHaveProperty('CLAUDE_CODE_OAUTH_TOKEN')
      expect(environment()).not.toHaveProperty('ANTHROPIC_API_KEY')
      expect(environment()).not.toHaveProperty('OPENAI_API_KEY')
      expect(registration()).toEqual(
        agent === 'claude'
          ? {
              computer: fakeComputerServer,
              conductive: {
                command: '/usr/local/bin/conductive',
                args: ['mcp'],
              },
            }
          : [
              'mcp_servers.conductive.command="/usr/local/bin/conductive"',
              'mcp_servers.conductive.args=["mcp"]',
              'mcp_servers.conductive.env_vars=["CONDUCTIVE_MACHINE_ORIGIN","CONDUCTIVE_WORKSPACE_TOKEN","CONDUCTIVE_TURN_ID"]',
              'mcp_servers.computer.command="/fake/platform/computer-server"',
              'mcp_servers.computer.args=["--socket","/run/test-computer.sock"]',
            ],
      )
      expect(JSON.stringify(registration())).not.toContain('workspace-secret')
      expect(JSON.stringify(registration())).not.toContain(
        'https://machines.conductive.test',
      )
      expect(JSON.stringify(registration())).not.toContain(turnId)
    }
    check('turn-first')
    h.endpoint.send({
      ...duringTurn(turn('during', 'bob', agent)),
      type: 'message',
      turnId: 'turn-first',
    })
    await runner.idle()
    check('turn-first')
    h.endpoint.send(stop('session-1', 'turn-first'))
    await runner.idle()
    expect(
      agent === 'claude' ? queries[0].closed : servers.processes[0].closed,
    ).toBe(true)
    const next = turn('second', 'bob', agent)
    next.credential = first.credential
    h.endpoint.send(next)
    await runner.idle()
    check('turn-second')
    const concurrent = turn('parallel', 'charlie', agent)
    concurrent.sessionId = 'parallel-session'
    concurrent.message.sessionId = 'parallel-session'
    h.endpoint.send(concurrent)
    await runner.idle()
    expect(environment()).toMatchObject({ CONDUCTIVE_TURN_ID: 'turn-parallel' })
    expect(
      agent === 'claude'
        ? queries[1].parameters?.options?.env?.CONDUCTIVE_TURN_ID
        : servers.requests[1].env.CONDUCTIVE_TURN_ID,
    ).toBe('turn-second')
    await runner.close()
    expect(
      agent === 'claude'
        ? queries.map(({ closed }) => closed)
        : servers.processes.map(({ closed }) => closed),
    ).toEqual([true, true, true])
    expect(JSON.stringify(await h.storage.read())).not.toContain(
      'workspace-secret',
    )
    expect(h.warnings).toEqual([])
  },
)
