import { expect, it } from 'vitest'

import type { GitHubSnapshot } from './contracts'
import { MemoryWorkspace } from './memory-workspace'

it('finishes each summary copy before the next refresh reads GitHub', async () => {
  const memory = new MemoryWorkspace('workspace')
  const order: string[] = []
  const first: GitHubSnapshot = {
    banner: {
      state: 'no-commits',
      branch: 'changes',
      baseBranch: 'main',
      updatedAt: 1,
      pullRequest: null,
      createPullRequestUrl: null,
    },
    checks: { state: 'waiting-for-pull-request', checks: [] },
    headSha: null,
  }
  const second: GitHubSnapshot = {
    ...first,
    banner: {
      ...first.banner,
      state: 'none',
      pullRequest: null,
      createPullRequestUrl: 'https://github.com/a/b/compare/main...changes',
    },
  }
  const copied: GitHubSnapshot[] = []
  const authorize = async () => undefined
  const pending = memory.state.refresh(
    async () => {
      order.push('first-read')
      return first
    },
    authorize,
    {},
    async (snapshot) => {
      order.push('first-copy-start')
      await Promise.resolve()
      copied.push(snapshot)
      order.push('first-copy-end')
    },
  )
  const following = memory.state.refresh(
    async () => {
      order.push('second-read')
      return second
    },
    authorize,
    {},
    async (snapshot) => {
      copied.push(snapshot)
      order.push('second-copy')
    },
  )
  await Promise.all([pending, following])
  expect(order).toEqual([
    'first-read',
    'first-copy-start',
    'first-copy-end',
    'second-read',
    'second-copy',
  ])
  expect(copied).toEqual([first, second])
})
