import { beforeAll, expect, it } from 'vitest'
import { githubPaths } from '../../src/shared/github'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { HEAD_SHA } from '../github/fake-pull'
import { mergeFixture } from './merge.test-support'
import { queueBundle } from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('shows the old fork point after the base moves and verifies it again after a push', async () => {
  const f = await mergeFixture(bundle, 'single')
  try {
    expect((await f.change('DELETE', OUTER_WORKSPACE)).status).toBe(204)
    const initialBase = 'b'.repeat(40)
    const oldBase = 'a'.repeat(40)
    const newBase = 'c'.repeat(40)
    const newHead = 'd'.repeat(40)
    f.api.branches.set('refs/heads/main', initialBase)
    f.api.mergeBases.set(`${initialBase}...${HEAD_SHA}`, oldBase)
    expect((await f.change('POST', OUTER_WORKSPACE)).status).toBe(204)
    f.api.branches.set('refs/heads/main', newBase)
    f.api.pulls[2].mergeable = 'CONFLICTING'
    expect(await (await f.bar(OUTER_WORKSPACE)).json()).toMatchObject({
      queue: { oldBase, rebase: { base: 'main', oldBase } },
    })
    expect(
      await (
        await f.request(githubPaths.stored(OUTER_ORG, OUTER_WORKSPACE))
      ).json(),
    ).toMatchObject({ queue: { oldBase, rebase: { base: 'main', oldBase } } })

    f.api.pulls[2].headRefOid = newHead
    f.api.branches.set('refs/heads/changes', newHead)
    const moved = await (await f.bar(OUTER_WORKSPACE)).json()
    expect(moved).not.toHaveProperty('queue.oldBase')
    expect(moved).not.toHaveProperty('queue.rebase.oldBase')
    f.api.mergeBases.set(`${newBase}...${newHead}`, 'e'.repeat(40))
    f.api.mergeBases.set(`${oldBase}...${newHead}`, oldBase)
    await f.queue.advanceStartAlarm()
    expect(await (await f.bar(OUTER_WORKSPACE)).json()).toMatchObject({
      queue: { oldBase, rebase: { base: 'main', oldBase } },
    })
  } finally {
    await f.dispose()
  }
})
