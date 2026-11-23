import { beforeAll, expect, it } from 'vitest'

import { workspacesPath } from '../../src/shared/workspaces'
import { array } from '../chat/agent-events'
import { record, string } from '../chat/inputs'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { heldOperation } from '../test-support/held-operation'
import { FOREIGN, queueBundle, queueFixture } from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

function queuedWorkspaceIds(value: unknown) {
  return array(record(value).workspaces, record)
    .filter((row) => row.mergeQueue !== undefined)
    .map((row) => string(row.id))
}

it('admits only one org and exposes entries only inside that org', async () => {
  const f = await queueFixture(bundle)
  const barrier = heldOperation()
  try {
    let staged = 0
    f.api.onRequest = async (operation) => {
      if (operation !== 'BranchRules') return
      staged += 1
      if (staged === 2) barrier.release()
      await barrier.wait()
    }
    const other = { orgId: 'other-org', cookie: f.cookies.outsiderCookie }
    const [primary, secondary] = await Promise.all([
      f.change('POST', OUTER_WORKSPACE),
      f.change('POST', FOREIGN, other),
    ])
    expect(await f.actor(FOREIGN).wakeMergeQueue(f.scope)).toMatchObject({
      ok: false,
      error: { status: 404, code: 'not_found' },
    })
    expect([primary.status, secondary.status].sort()).toEqual([204, 409])
    expect(staged).toBe(2)
    const refusal = primary.status === 409 ? primary : secondary
    expect(await refusal.json()).toEqual({
      error: {
        code: 'merge_queue_repository_in_use',
        message: 'Another organization already queues this repository.',
      },
    })
    const [list, otherList] = await Promise.all([
      f.request(workspacesPath(OUTER_ORG)),
      f.request(workspacesPath('other-org'), {
        headers: { Cookie: other.cookie },
      }),
    ])
    expect(queuedWorkspaceIds(await list.json())).toEqual(
      primary.status === 204 ? [OUTER_WORKSPACE] : [],
    )
    expect(queuedWorkspaceIds(await otherList.json())).toEqual(
      secondary.status === 204 ? [FOREIGN] : [],
    )
  } finally {
    barrier.release()
    await f.dispose()
  }
})
