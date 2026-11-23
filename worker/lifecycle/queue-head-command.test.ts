import { unlink } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { baseChangeFetchCommand } from './base-change-commands'
import { continueNativeFixture } from './continue-native.test-support'
import { HEAD_SYNC_NEEDS_TURN, queueHeadCommand } from './queue-head-command'

it('installs a rewritten head only on the clean old branch and still succeeds after a retry', async () => {
  const f = await continueNativeFixture(true)
  const branch = 'owner/old'
  await f.write('layer.txt', 'old own commit\n')
  await f.git('add', 'layer.txt')
  await f.git('commit', '-m', 'Old layer')
  const oldHead = (await f.git('rev-parse', 'HEAD')).trim()
  await f.git('push', 'origin', branch)
  await f.seedGit(
    'push',
    '--force',
    '--quiet',
    join(f.root, 'repository.git'),
    `main:refs/heads/${branch}`,
  )
  const source = {
    stage: join(f.root, 'queued-head.git'),
    directory: f.directory,
    branch,
    baseBranch: branch,
    fetchId: 'baseChange-owner-sync',
    fullName: f.job.binding.fullName,
  }
  expect((await f.execute(baseChangeFetchCommand(source))).exitCode).toBe(0)
  const install = () =>
    f.execute(
      queueHeadCommand({
        ...source,
        oldHead,
        newHead: f.latest,
      }),
    )
  await f.write('carry.txt', 'local edit\n')
  expect((await install()).exitCode).toBe(HEAD_SYNC_NEEDS_TURN)
  expect(await f.read('carry.txt')).toBe('local edit\n')
  expect(await f.git('rev-parse', 'HEAD')).toBe(`${oldHead}\n`)

  await f.git('add', 'carry.txt')
  await f.git('commit', '-m', 'Unpushed local work')
  const local = await f.git('rev-parse', 'HEAD')
  expect((await install()).exitCode).toBe(HEAD_SYNC_NEEDS_TURN)
  expect(await f.git('rev-parse', 'HEAD')).toBe(local)
  await f.git('reset', '--hard', oldHead)

  await f.write('ignored.txt', 'local ignored work\n')
  expect((await install()).exitCode).toBe(HEAD_SYNC_NEEDS_TURN)
  expect(await f.git('rev-parse', 'HEAD')).toBe(`${oldHead}\n`)
  expect(await f.read('ignored.txt')).toBe('local ignored work\n')
  await unlink(join(f.directory, 'ignored.txt'))
  expect((await install()).exitCode).toBe(0)
  expect(await f.git('rev-parse', 'HEAD')).toBe(`${f.latest}\n`)
  expect(await f.git('rev-parse', `origin/${branch}`)).toBe(`${f.latest}\n`)
  expect(await f.git('status', '--porcelain')).toBe('')
  expect(f.credentialIds).toEqual(['baseChange-owner-sync'])
})
