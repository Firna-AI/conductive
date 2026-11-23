import { beforeAll, expect, it } from 'vitest'

import { OUTER_WORKSPACE } from '../chat/integration/outer-seed.test-support'
import { HEAD_SHA, passedRun } from '../github/fake-pull'
import { recordedPullRequest } from '../github/recorded-webhooks'
import { heldOperation } from '../test-support/held-operation'
import { mergeFixture } from './merge.test-support'
import { queueBundle, queueWebhook } from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('leaves only after the merge settles when a signed draft webhook arrives during Merge', async () => {
  const f = await mergeFixture(bundle, 'units')
  const merge = heldOperation()
  const refresh = heldOperation()
  try {
    let started = false
    f.api.onRequest = async (operation) => {
      if (operation === 'MergeStart') {
        started = true
        await merge.wait()
      }
      if (started && operation === 'BannerLookup') await refresh.wait()
    }
    const click = f.click(f.top, 1)
    await merge.entered
    const pull = f.api.pulls[f.pullNumber]
    pull.isDraft = true
    const payload = recordedPullRequest.pull_request
    const webhook = queueWebhook(f, 'pull_request', 'draft-during-merge', {
      ...recordedPullRequest,
      action: 'converted_to_draft',
      number: f.pullNumber,
      pull_request: {
        ...payload,
        number: f.pullNumber,
        head: { ...payload.head, ref: f.branch, sha: pull.headRefOid },
      },
    })
    await refresh.entered
    const patches = () =>
      f.api.requests.filter(({ method }) => method === 'PATCH')
    expect(patches()).toEqual([])
    refresh.release()
    merge.release()
    const [accepted, delivered] = await Promise.all([click, webhook])
    expect([accepted.status, delivered.status]).toEqual([202, 204])
    expect(f.writes()).toHaveLength(1)
    expect(patches()).toEqual([])
    expect(await f.entries()).toMatchObject([
      { pullNumber: 2, state: 'merging' },
      { pullNumber: 4, state: 'merging' },
    ])
    f.api.checks.set(HEAD_SHA, [{ ...passedRun, conclusion: 'FAILURE' }])
    for (const job of f.api.merges.jobs.values()) job.state = 'failed'
    await f.queue.advanceStartAlarm(await f.queue.testAlarmTime())
    expect(patches()).toEqual([])
    const pollAt = await f.queue.readStartAlarm()
    if (pollAt === null) throw new Error('The merge result has no saved alarm.')
    await f.queue.advanceStartAlarm(pollAt)
    expect((await f.entries()).map(({ workspaceId }) => workspaceId)).toEqual([
      OUTER_WORKSPACE,
    ])
    expect(patches()).toHaveLength(1)
    expect(await patches()[0].clone().json()).toEqual({ base: 'main' })
    expect(f.writes()).toHaveLength(1)
    expect(await f.records()).toEqual([])
  } finally {
    merge.release()
    refresh.release()
    await f.dispose()
  }
})
