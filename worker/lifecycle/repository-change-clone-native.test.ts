import { mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { expect, it } from 'vitest'

import { continueNativeFixture } from './continue-native.test-support'
import { repositoryCloneNamesCommand } from './repository-change-clone-command'
import {
  repositoryChangeBranchCommand,
  repositoryChangeFetchCommand,
  repositoryChangeMoveCommand,
} from './repository-change-commands'
import { REPOSITORY_CODE_DIRECTORY } from './repository-locations'

async function cloneFixture() {
  const f = await continueNativeFixture()
  const code = join(f.home, 'code')
  const directory = join(code, 'repository')
  await mkdir(join(f.directory, '.context', 'attachments'), { recursive: true })
  await writeFile(
    join(f.directory, '.context', 'attachments', 'a.txt'),
    'attached\n',
  )
  const job = {
    ...f.job,
    target: {
      repositoryId: 'clone',
      fullName: f.job.binding.fullName,
      directory: `${REPOSITORY_CODE_DIRECTORY}/repository`,
      binding: f.job.binding,
      clone: { variable: 'CONDUCTIVE_REPOSITORY_REPOSITORY_DIR' },
    },
  }
  const execute = (command: string) =>
    f.execute(command.replaceAll(REPOSITORY_CODE_DIRECTORY, code))
  return {
    ...f,
    code,
    directory,
    names: () => execute(repositoryCloneNamesCommand),
    fetch: () => execute(repositoryChangeFetchCommand(job)),
    move: (recordedFolders?: readonly string[]) =>
      execute(repositoryChangeMoveCommand(job, recordedFolders)),
    branch: () => execute(repositoryChangeBranchCommand(job)),
    git: (...args: string[]) => f.git('-C', directory, ...args),
    read: (path: string) => readFile(join(directory, path), 'utf8'),
  }
}

it('clones every branch and tag with the member credential and installs a complete work tree', async () => {
  const f = await cloneFixture()
  await f.remoteGit('update-ref', 'refs/heads/release/next', f.latest)
  const tree = (await f.remoteGit('rev-parse', 'main^{tree}')).trim()
  const tagged = (
    await f.remoteGit('commit-tree', tree, '-m', 'Tag only')
  ).trim()
  await f.remoteGit('tag', '-a', 'v9', tagged, '-m', 'Tag only')

  expect(await f.branch()).toMatchObject({ exitCode: 0, stdout: '\n' })
  expect(await f.fetch()).toMatchObject({ exitCode: 0 })
  expect(await f.move()).toMatchObject({ exitCode: 0 })

  expect(f.credentialIds).toEqual([f.job.fetchId])
  expect(await f.branch()).toMatchObject({ exitCode: 0, stdout: 'owner/new\n' })
  expect(
    await f.git('rev-parse', 'HEAD', 'origin/main', 'origin/release/next'),
  ).toBe(`${f.latest}\n${f.latest}\n${f.latest}\n`)
  expect(await f.git('rev-parse', 'refs/tags/v9^{commit}')).toBe(`${tagged}\n`)
  expect(await f.git('rev-parse', '--abbrev-ref', 'main@{upstream}')).toBe(
    'origin/main\n',
  )
  expect(await f.git('symbolic-ref', 'refs/remotes/origin/HEAD')).toBe(
    'refs/remotes/origin/main\n',
  )
  expect(await f.git('remote', 'get-url', 'origin')).toMatch(
    /^http:\/\/127\.0\.0\.1:\d+\/repository\.git\n$/,
  )
  expect(await f.git('config', 'remote.origin.fetch')).toBe(
    '+refs/heads/*:refs/remotes/origin/*\n',
  )
  expect(await f.read('base.txt')).toBe('latest base\n')
  expect(await f.read('.context/attachments/a.txt')).toBe('attached\n')
  expect(await f.read('.git/info/exclude')).toBe('/.context/\n')
  expect(await f.git('status', '--porcelain=v1')).toBe('')
  expect(await readdir(f.code)).toEqual(['repository'])
})

it('refuses a name that appeared on disk and removes the temporary clone', async () => {
  const f = await cloneFixture()
  await mkdir(f.code)
  expect(await f.fetch()).toMatchObject({ exitCode: 0 })
  const collision = join(f.code, 'Repository')
  await symlink(join(f.code, 'missing'), collision)
  expect(await f.names()).toMatchObject({
    exitCode: 0,
    stdout: 'Repository\0\0',
  })
  expect(await f.move()).toMatchObject({ exitCode: 1 })
  expect(await f.branch()).toMatchObject({ exitCode: 0, stdout: '\n' })
  expect(await readdir(f.code)).toEqual(['Repository'])
  await expect(f.stageConfig()).rejects.toMatchObject({ code: 'ENOENT' })
})

it('sweeps abandoned clone stages and work trees while keeping recorded folders', async () => {
  const f = await cloneFixture()
  const staleStage = f.stagePath('earlier-job')
  const unrelated = join(dirname(dirname(staleStage)), 'unrelated')
  const staleWorkTree = `.conductive-clone-${'a'.repeat(43)}.stale1`
  const held = `.conductive-clone-${'b'.repeat(43)}.saved1`
  await mkdir(staleStage, { recursive: true })
  await mkdir(unrelated)
  await mkdir(join(f.code, staleWorkTree), { recursive: true })
  await mkdir(join(f.code, held))

  expect(await f.fetch()).toMatchObject({ exitCode: 0 })
  await expect(readdir(staleStage)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readdir(unrelated)).toEqual([])
  expect(await f.move([`${REPOSITORY_CODE_DIRECTORY}/${held}`])).toMatchObject({
    exitCode: 0,
  })
  expect((await readdir(f.code)).sort()).toEqual([held, 'repository'])
})

it('keeps unrelated stages when the staging root is a link', async () => {
  const f = await cloneFixture()
  const staged = join(f.root, 'linked-stages')
  const previous = join(staged, 'earlier-job', 'source.git')
  await mkdir(previous, { recursive: true })
  await symlink(staged, dirname(dirname(f.stagePath())))

  expect(await f.fetch()).toMatchObject({ exitCode: 0 })
  expect(await f.move()).toMatchObject({ exitCode: 0 })
  expect(await readdir(staged)).toEqual(['earlier-job'])
})
