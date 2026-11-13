import { join } from 'node:path'

import { expect, it, onTestFinished, vi } from 'vitest'

import { FakeAppServers } from '../test-support/app-server'
import { runnerHarness } from '../test-support/harness'
import {
  codexAnswer,
  codexServers,
  skillReports,
  skillText,
} from '../test-support/skills'
import { SkillLists } from './skills'

it('lists the enabled Codex skills that the app server gives, with the shared Codex home and no workspace token', async () => {
  vi.stubEnv('CONDUCTIVE_WORKSPACE_TOKEN', 'workspace-secret')
  onTestFinished(() => {
    vi.unstubAllEnvs()
  })
  let root = ''
  const system = '/home/agent/.conductive/codex/skills/.system/creator/SKILL.md'
  const servers = new FakeAppServers()
  servers.prepare = (server) =>
    server.results.set(
      'skills/list',
      codexAnswer(root, [
        {
          name: 'review',
          description: 'Review a change.',
          path: join(root, '.agents', 'skills', 'review', 'SKILL.md'),
        },
        { name: 'creator', description: 'Create a skill.', path: system },
        {
          name: 'off',
          description: 'Turned off.',
          path: join(root, '.agents', 'skills', 'off', 'SKILL.md'),
          enabled: false,
        },
      ]),
    )
  const lists = new SkillLists()
  const h = await runnerHarness(
    async (repository) => {
      root = repository.root
    },
    { skills: { lists, start: servers.start } },
  )
  expect(skillReports(h.endpoint.runnerEvents)).toEqual([
    {
      claude: [],
      codex: [
        { name: 'creator', description: 'Create a skill.' },
        { name: 'review', description: 'Review a change.' },
      ],
    },
  ])
  expect(lists.of('codex')).toEqual([
    { name: 'creator', description: 'Create a skill.', path: system },
    {
      name: 'review',
      description: 'Review a change.',
      path: join(h.root, '.agents', 'skills', 'review', 'SKILL.md'),
    },
  ])
  const [request] = servers.requests
  expect({
    cwd: request.cwd,
    home: request.env.CODEX_HOME,
    token: request.env.CONDUCTIVE_WORKSPACE_TOKEN,
    args: request.args.slice(1),
  }).toEqual({
    cwd: h.root,
    home: join(h.home, '.conductive', 'codex'),
    token: undefined,
    args: ['app-server', '-c', 'cli_auth_credentials_store="ephemeral"'],
  })
  expect(
    servers.latest.writes.find(({ method }) => method === 'skills/list')
      ?.params,
  ).toEqual({ cwds: [h.root], forceReload: true })
  expect(servers.latest.closed).toBe(true)
  expect(h.warnings).toEqual([])
})

it('scans the Codex folders as Codex does when the app server gives no answer, and warns once', async () => {
  const servers = codexServers(null)
  const h = await runnerHarness(
    async (repository) => {
      const write = (path: string, text: string) => repository.write(path, text)
      await write(
        '.agents/skills/alpha/SKILL.md',
        skillText({ description: 'From the agents folder.' }),
      )
      await write(
        '.codex/skills/group/beta/SKILL.md',
        skillText({ name: 'beta', description: 'Nested in the Codex folder.' }),
      )
      await write(
        '.agents/skills/.hidden/gamma/SKILL.md',
        skillText({ name: 'gamma', description: 'In a hidden folder.' }),
      )
      await write(
        '.agents/skills/no-description/SKILL.md',
        skillText({ name: 'no-description' }),
      )
    },
    { skills: { lists: new SkillLists(), start: servers.start, timeoutMs: 1 } },
  )
  h.endpoint.disconnect()
  await h.runner.connect()
  const report = {
    claude: [],
    codex: [
      { name: 'alpha', description: 'From the agents folder.' },
      { name: 'beta', description: 'Nested in the Codex folder.' },
    ],
  }
  expect(skillReports(h.endpoint.runnerEvents)).toEqual([report, report])
  expect(servers.processes.map(({ closed }) => closed)).toEqual([true, true])
  expect(h.warnings).toEqual([
    'The Codex app server did not list its skills. The Codex list uses a scan of the Codex skill folders.',
    `The front matter of ${join(h.root, '.agents', 'skills', 'no-description', 'SKILL.md')} gives no description. The Codex list leaves out its skill.`,
  ])
})
