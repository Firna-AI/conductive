import { createServer } from 'node:http'
import { access, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { afterEach, expect, it, onTestFinished, vi } from 'vitest'

import { turn, runnerHarness } from '../test-support/harness'
import { skillsFixture } from '../test-support/skills-repository'
import { deferred } from '../test-support/runtime'
import { Runner } from './runner'
import * as git from './skills-git'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

it('deletes the copy when the setting is removed', async () => {
  const h = await skillsFixture()
  await h.skill('skills/alpha', 'alpha')
  await h.publish()
  const copy = h.create()
  await copy.refresh()
  const oldPath = copy.folders[0].path
  await copy.close()
  const removed = h.create('')
  await removed.refresh()
  expect(removed.folders).toEqual([])
  await expect(access(oldPath)).rejects.toMatchObject({ code: 'ENOENT' })
  await expect(
    access(join(h.home, '.conductive', 'skills')),
  ).rejects.toMatchObject({ code: 'ENOENT' })
  expect(h.warnings).toEqual([])
})

it('deletes the old repository before a replacement copy fails and never offers the old skills', async () => {
  const h = await skillsFixture()
  await h.skill('skills/alpha', 'alpha')
  await h.publish()
  const copy = h.create()
  await copy.refresh()
  const oldPath = copy.folders[0].path
  await copy.close()
  const replacement = h.create('org/missing')
  await replacement.refresh()
  expect(replacement.folders).toEqual([])
  await expect(access(oldPath)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(h.warnings).toHaveLength(1)
  expect(h.warnings[0]).toContain('The skills repository could not update.')
  expect(
    await readdir(join(h.home, '.conductive', 'skills', 'repositories', 'org')),
  ).toEqual(['missing'])
})

it('rejects an invalid repository name before a Git command can use it', async () => {
  const h = await skillsFixture()
  const run = vi.spyOn(git, 'skillsGit')
  const copy = h.create('org/../../elsewhere')
  await copy.refresh()
  expect(copy.folders).toEqual([])
  expect(run).not.toHaveBeenCalled()
  expect(h.warnings).toEqual([
    'The skills repository name is invalid. No org skills will load.',
  ])
})

it('warns without prompting or sending credentials when a repository needs authentication', async () => {
  vi.stubEnv('GIT_CONFIG_COUNT', '1')
  vi.stubEnv('GIT_CONFIG_KEY_0', 'http.extraheader')
  vi.stubEnv('GIT_CONFIG_VALUE_0', 'Authorization: Bearer inherited-token')
  vi.stubEnv('GIT_TERMINAL_PROMPT', '1')
  vi.stubEnv('GIT_ASKPASS', '/unavailable-askpass')
  const h = await skillsFixture()
  await writeFile(
    join(h.home, '.netrc'),
    'machine 127.0.0.1 login private-user password private-token\n',
  )
  vi.stubEnv('HOME', h.home)
  const headers: (string | undefined)[] = []
  const server = createServer((request, response) => {
    headers.push(request.headers.authorization)
    response.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="private repository"',
    })
    response.end()
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  onTestFinished(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  )
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('The fake Git server did not listen.')
  const copy = h.create('org/private', 1000, `http://127.0.0.1:${address.port}`)
  await copy.refresh()
  expect(copy.folders).toEqual([])
  expect(headers).toEqual([undefined])
  expect(h.warnings).toHaveLength(1)
  expect(h.warnings[0]).toContain('terminal prompts disabled')
})

it('starts the runner and a turn while the first skills fetch still waits', async () => {
  const h = await skillsFixture()
  await h.skill('skills/alpha', 'alpha')
  await h.publish()
  const entered = deferred<void>()
  const held = deferred<void>()
  const actual = git.skillsGit
  vi.spyOn(git, 'skillsGit').mockImplementation(async (args, signal, home) => {
    if (args.includes('fetch')) {
      entered.resolve()
      await held.promise
    }
    return actual(args, signal, home)
  })
  onTestFinished(() => held.resolve())
  const wire = await runnerHarness()
  await wire.runner.close()
  const copy = h.create()
  copy.start()
  await entered.promise
  const runner = new Runner({
    ...wire.options,
    providers: {
      claude: copy.provider(wire.providers.open),
      codex: copy.provider(wire.providers.open),
    },
  })
  onTestFinished(() => runner.close())
  await runner.start(false)
  await runner.engine.command(turn())
  await runner.idle()
  expect(wire.providers.latest.options.skillFolders).toEqual([])
  expect(
    wire.providers.latest.messages.map((message) => message.message.id),
  ).toEqual(['message-1'])
  expect(copy.folders).toEqual([])
  held.resolve()
  await copy.refresh()
  wire.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1'],
  })
  await runner.idle()
  await runner.engine.command(turn('2'))
  await runner.idle()
  expect(
    wire.providers.latest.options.skillFolders?.map((skill) => skill.name),
  ).toEqual(['alpha'])
})
