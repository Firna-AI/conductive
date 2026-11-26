import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { continueNativeFixture } from './continue-native.test-support'
import { localWorkResult } from './local-work'
import {
  carriedWorkCommand,
  repositoryChangeBranchCommand,
  repositoryChangeFetchCommand,
  repositoryChangeMoveCommand,
  repositoryChangeSettleCommand,
} from './repository-change-commands'

/** The Continue repository is the new folder. The old folder holds a context folder. */
async function changeFixture() {
  const f = await continueNativeFixture()
  const old = join(f.home, 'old folder')
  await mkdir(join(old, '.context', 'attachments'), { recursive: true })
  await writeFile(join(old, '.context', 'notes.md'), 'old notes\n')
  await writeFile(join(old, '.context', 'kept.md'), 'old copy\n')
  await writeFile(join(old, '.context', 'attachments', 'a.txt'), 'attached\n')
  const run = join(f.root, 'runtime')
  const job = {
    id: f.job.id,
    fetchId: f.job.fetchId,
    baseBranch: 'main',
    branch: 'owner/new',
    directory: old,
    target: {
      repositoryId: 'new',
      fullName: f.job.binding.fullName,
      directory: f.directory,
      binding: f.job.binding,
    },
  }
  const execute = (command: string) =>
    f.execute(command.replaceAll('/run/conductive', run))
  return {
    ...f,
    old,
    run,
    job,
    carried: async () => {
      const result = await execute(carriedWorkCommand(f.directory))
      if (result.exitCode !== 0) throw new Error(result.stderr)
      return localWorkResult(result.stdout).uncommittedFiles
    },
    fetch: () => execute(repositoryChangeFetchCommand(job)),
    move: () => execute(repositoryChangeMoveCommand(job)),
    branch: () => execute(repositoryChangeBranchCommand(job)),
    settle: () => execute(repositoryChangeSettleCommand(job)),
  }
}

it('adds the exclude rule first, copies the context folder without replacing a file, and carries the changed files to the new branch', async () => {
  const f = await changeFixture()
  await mkdir(join(f.directory, '.context'))
  await f.write('.context/kept.md', 'new copy\n')
  await f.write('.git/info/exclude', '# rules')
  await f.write('carry.txt', 'uncommitted content\n')
  await f.write('untracked.txt', 'untracked content\n')
  expect(await f.carried()).toEqual(['carry.txt', 'untracked.txt'])
  expect((await f.fetch()).exitCode).toBe(0)
  const moved = await f.move()
  expect(moved.exitCode, moved.stderr).toBe(0)
  expect(await f.git('symbolic-ref', '--short', 'HEAD')).toBe('owner/new\n')
  expect(await f.git('rev-parse', 'HEAD')).toBe(`${f.latest}\n`)
  expect(await f.git('config', 'branch.owner/new.gh-merge-base')).toBe('main\n')
  expect(await f.read('.git/info/exclude')).toBe('# rules\n/.context/\n')
  expect(await f.read('.context/notes.md')).toBe('old notes\n')
  expect(await f.read('.context/kept.md')).toBe('new copy\n')
  expect(await f.read('.context/attachments/a.txt')).toBe('attached\n')
  expect(await readFile(join(f.old, '.context', 'kept.md'), 'utf8')).toBe(
    'old copy\n',
  )
  expect(await f.read('carry.txt')).toBe('uncommitted content\n')
  expect(await f.git('status', '--porcelain=v1')).toBe(
    ' M carry.txt\n?? untracked.txt\n',
  )
  expect(await f.branch()).toMatchObject({ exitCode: 0, stdout: 'owner/new\n' })
  expect((await f.move()).exitCode).not.toBe(0)
  expect(await f.read('.git/info/exclude')).toBe('# rules\n/.context/\n')
})

it('stops before the checkout when the context folder of the new folder is a link', async () => {
  const f = await changeFixture()
  await symlink(f.old, join(f.directory, '.context'))
  expect((await f.fetch()).exitCode).toBe(0)
  expect((await f.move()).exitCode).toBe(81)
  expect(await f.git('symbolic-ref', '--short', 'HEAD')).toBe('owner/old\n')
  expect(
    await f.git('for-each-ref', '--format=%(refname)', 'refs/heads/'),
  ).toBe('refs/heads/owner/old\n')
  expect(await f.branch()).toMatchObject({ exitCode: 0, stdout: 'owner/old\n' })
})

it('keeps the branch and the changed files of the new folder when they clash with the new base', async () => {
  const f = await changeFixture()
  await f.write('clash.txt', 'local content\n')
  const head = await f.git('rev-parse', 'HEAD')
  expect((await f.fetch()).exitCode).toBe(0)
  expect((await f.move()).exitCode).toBe(82)
  expect(await f.git('symbolic-ref', '--short', 'HEAD')).toBe('owner/old\n')
  expect(await f.git('rev-parse', 'HEAD')).toBe(head)
  expect(await f.read('clash.txt')).toBe('local content\n')
})

it('copies a later context file again and names the new folder for new terminals after publication', async () => {
  const f = await changeFixture()
  await mkdir(f.run)
  await writeFile(join(f.old, '.context', 'late.md'), 'attached later\n')
  const settled = await f.settle()
  expect(settled.exitCode, settled.stderr).toBe(0)
  expect(await f.read('.context/late.md')).toBe('attached later\n')
  expect(await readFile(join(f.run, 'repository'), 'utf8')).toBe(
    `${f.directory}\n`,
  )
  await f.git('checkout', '--quiet', '--detach')
  expect(await f.branch()).toMatchObject({ exitCode: 0, stdout: '\n' })
})
