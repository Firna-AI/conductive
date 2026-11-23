import { beforeAll, expect, it } from 'vitest'

import { OUTER_WORKSPACE } from '../chat/integration/outer-seed.test-support'
import { HEAD_SHA, passedRun } from '../github/fake-pull'
import { mergeFixture, TOP_HEAD } from './merge.test-support'
import { queueBundle } from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it.each(['Remove from queue', 'a refused Merge click'])(
  'keeps a member’s GitHub base edit when %s arrives first',
  async (action) => {
    const f = await mergeFixture(bundle, 'units')
    try {
      f.api.checks.set(HEAD_SHA, [{ ...passedRun, conclusion: 'FAILURE' }])
      await f.queue.advanceStartAlarm()
      expect(await f.queue.readStartAlarm()).toBeNull()
      f.api.branches.set('refs/heads/review-target', TOP_HEAD)
      f.api.pulls[f.pullNumber].baseRefName = 'review-target'
      const response =
        action === 'Remove from queue'
          ? await f.change('DELETE', f.top)
          : await f.click(f.top, 1)
      expect(response.status).toBe(action === 'Remove from queue' ? 204 : 409)
      if (response.status === 409) {
        expect(await response.json()).toHaveProperty(
          'error.code',
          'merge_queue_not_ready',
        )
        await f.queue.advanceStartAlarm()
      }
      expect((await f.entries()).map(({ workspaceId }) => workspaceId)).toEqual(
        [OUTER_WORKSPACE],
      )
      expect(f.api.pulls[f.pullNumber].baseRefName).toBe('review-target')
      expect(
        await f.db
          .prepare('SELECT base_branch FROM workspaces WHERE id = ?')
          .bind(f.top)
          .first('base_branch'),
      ).toBe('review-target')
      expect(f.api.requests.filter(({ method }) => method === 'PATCH')).toEqual(
        [],
      )
      expect(await (await f.bar(f.top)).json()).not.toHaveProperty('queueLeave')
    } finally {
      await f.dispose()
    }
  },
)
