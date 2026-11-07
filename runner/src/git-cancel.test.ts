import { execFile } from 'node:child_process'
import { constants } from 'node:fs'
import { open } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { expect, it } from 'vitest'

import { repositoryFixture } from '../test-support/repository'
import { Git } from './git'
import { withGitIndex } from './git-index'

const execute = promisify(execFile)

it('cancels Git commands and inherits the same signal in a temporary comparison index', async () => {
  const h = await repositoryFixture()
  const canceled = new AbortController()
  canceled.abort()
  await expect(
    new Git(h.root, {}, canceled.signal).run(['--version']),
  ).rejects.toMatchObject({ cause: { name: 'AbortError' } })
  const controller = new AbortController()
  await withGitIndex(new Git(h.root, {}, controller.signal), async (index) => {
    controller.abort()
    await expect(index.git.run(['--version'])).rejects.toMatchObject({
      cause: { name: 'AbortError' },
    })
  })
  expect((await h.git('--version')).trim()).toMatch(/^git version /)
})
it('cancels a Git command that is already reading when its signal aborts', async () => {
  const h = await repositoryFixture()
  const path = join(h.home, 'held-input')
  await execute('mkfifo', [path])
  const controller = new AbortController()
  const running = new Git(h.root, {}, controller.signal)
    .run(['hash-object', path])
    .then(
      (bytes) => ({ ok: true, bytes }),
      (error: unknown) => ({ ok: false, error }),
    )
  const writer = await open(path, constants.O_WRONLY)
  try {
    controller.abort()
    await writer.close()
    expect(await running).toMatchObject({
      ok: false,
      error: { cause: { name: 'AbortError' } },
    })
  } finally {
    controller.abort()
    await writer.close()
    await running
  }
})
