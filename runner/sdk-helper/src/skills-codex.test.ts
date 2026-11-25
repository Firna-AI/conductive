import { symlink, unlink } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it, onTestFinished, vi } from 'vitest'

import { FakeAppServers } from '../test-support/app-server'
import { codexAnswer, scannerFixture, skillText } from '../test-support/skills'

it('lists enabled Codex skills with the shared home and no workspace token', async () => {
  vi.stubEnv('CONDUCTIVE_WORKSPACE_TOKEN', 'workspace-secret')
  onTestFinished(() => {
    vi.unstubAllEnvs()
  })
  const servers = new FakeAppServers()
  const h = await scannerFixture({ start: servers.start })
  const reviewFile = '.agents/skills/review/SKILL.md'
  const systemFile = '.conductive/codex/skills/.system/creator/SKILL.md'
  await h.write(reviewFile, skillText({ description: 'Review a change.' }))
  await h.write(systemFile, skillText({ description: 'Create a skill.' }))
  const review = join(h.root, reviewFile)
  const system = join(h.home, systemFile)
  servers.prepare = (server) =>
    server.results.set(
      'skills/list',
      codexAnswer(h.root, [
        {
          name: 'review',
          description: 'Review a change.',
          path: review,
        },
        { name: 'creator', description: 'Create a skill.', path: system },
        {
          name: 'off',
          description: 'Turned off.',
          path: join(h.root, '.agents/skills/off/SKILL.md'),
          enabled: false,
        },
      ]),
    )
  expect(await h.scanner.scan()).toEqual({
    claude: [],
    codex: [
      {
        name: 'review',
        description: 'Review a change.',
        path: review,
      },
      { name: 'creator', description: 'Create a skill.', path: system },
    ],
  })
  const [request] = servers.requests
  expect({
    cwd: request.cwd,
    home: request.env.CODEX_HOME,
    token: request.env.CONDUCTIVE_WORKSPACE_TOKEN,
    args: request.args.slice(1),
  }).toEqual({
    cwd: h.root,
    home: join(h.home, '.conductive/codex'),
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

it('omits a cached Codex app-server entry when its SKILL.md links to README.md', async () => {
  const h = await scannerFixture()
  const folder = '.conductive/codex/skills/review'
  const file = `${folder}/SKILL.md`
  const description = 'Review a change.'
  const path = join(h.home, file)
  const skill = { name: 'review', description, path }
  await h.write(file, skillText({ description }))
  await h.write(`${folder}/README.md`, skillText({ description }))
  h.servers.prepare = (server) =>
    server.results.set('skills/list', codexAnswer(h.root, [skill]))

  expect((await h.scanner.scan()).codex).toEqual([skill])
  await unlink(path)
  await symlink('README.md', path)

  expect((await h.scanner.scan()).codex).toEqual([])
  expect(h.servers.processes).toHaveLength(1)
  expect((await h.scanner.scan(true)).codex).toEqual([])
  expect(h.warnings).toEqual([
    `The skill file ${path} could not be read. The list leaves out its skill.`,
  ])
})

it('scans visible Codex folders when the app server fails and warns once', async () => {
  const h = await scannerFixture({
    start: () => {
      throw new Error('server unavailable')
    },
  })
  await h.write(
    '.agents/skills/alpha/SKILL.md',
    skillText({ description: 'From the agents folder.' }),
  )
  await h.write(
    '.codex/skills/group/beta/SKILL.md',
    skillText({ name: 'beta', description: 'Nested in the Codex folder.' }),
  )
  await h.write(
    '.agents/skills/.hidden/gamma/SKILL.md',
    skillText({ name: 'gamma', description: 'Hidden.' }),
  )
  await h.write(
    '.agents/skills/no-description/SKILL.md',
    skillText({ name: 'no-description' }),
  )
  const linked = '.agents/skills/readme'
  await h.write(`${linked}/README.md`, skillText({ description: 'Read me.' }))
  await symlink('README.md', join(h.root, linked, 'SKILL.md'))
  const expected = {
    claude: [],
    codex: [
      {
        name: 'alpha',
        description: 'From the agents folder.',
        path: join(h.root, '.agents/skills/alpha/SKILL.md'),
      },
      {
        name: 'beta',
        description: 'Nested in the Codex folder.',
        path: join(h.root, '.codex/skills/group/beta/SKILL.md'),
      },
    ],
  }
  expect(await h.scanner.scan()).toEqual(expected)
  expect(await h.scanner.scan(true)).toEqual(expected)
  expect(h.warnings).toEqual([
    'The Codex app server did not list its skills. The Codex list uses a scan of the Codex skill folders.',
    `The front matter of ${join(h.root, '.agents/skills/no-description/SKILL.md')} gives no description. The Codex list leaves out its skill.`,
    `The skill file ${join(h.root, linked, 'SKILL.md')} could not be read. The list leaves out its skill.`,
  ])
})
