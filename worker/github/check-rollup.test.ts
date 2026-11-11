import { expect, it } from 'vitest'

import { HEAD_SHA, passedRun } from './fake-pull'
import { createReaderHarness } from './reader-test-harness'

it('pages head checks when the merge commit or its checks are absent', async () => {
  for (const merge of ['missing', 'empty', 'null-rollup']) {
    const { api, read } = createReaderHarness()
    api.pageSize = 1
    api.pulls[2].potentialMergeCommit =
      merge === 'missing' ? null : { oid: 'merge-commit' }
    api.checks.set(HEAD_SHA, [passedRun, { ...passedRun, id: 'second-head' }])
    if (merge === 'empty') api.checks.set('merge-commit', [])
    const snapshot = await read()
    expect(
      snapshot.checks.checks.map((check) => check.id),
      merge,
    ).toEqual(['run-z', 'second-head'])
    expect(snapshot.banner.state).toBe('ready-to-merge')
  }
})

it('refuses a changed test merge commit while paging either chosen rollup', async () => {
  for (const selected of ['merge', 'head', 'head-without-merge']) {
    const { api, read } = createReaderHarness()
    api.pageSize = 1
    api.pulls[2].potentialMergeCommit =
      selected === 'head-without-merge' ? null : { oid: 'merge-commit' }
    const checks = [passedRun, { ...passedRun, id: 'second-check' }]
    api.checks.set(HEAD_SHA, checks)
    api.checks.set('merge-commit', selected === 'merge' ? checks : [])
    api.onRequest = async (operation) => {
      if (operation === 'BannerChecks')
        api.pulls[2].potentialMergeCommit = { oid: 'new-merge' }
    }
    await expect(read(), selected).rejects.toMatchObject({
      status: 502,
      code: 'github_unavailable',
    })
  }
})
