import { expect, it } from 'vitest'

import { repositoryFixture } from '../test-support/repository'
import { Git } from './git'
import { withGitIndex } from './git-index'

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
