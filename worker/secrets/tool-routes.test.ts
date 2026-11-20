import { afterEach, beforeAll, expect, it } from 'vitest'
import { SECRET_TOOL_PATHS } from '../../src/shared/secret-requests'
import { TOOL_TURN_HEADER } from '../../src/shared/agent-tools'
import {
  outerWorkerBundle,
  OUTER_MACHINE_ORIGIN,
} from '../chat/integration/outer-runtime.test-support'
import { OUTER_TOKEN } from '../chat/integration/outer-seed.test-support'
import {
  reviewWorkspaceFixture,
  type ReviewWorkspaceFixture,
} from '../chat/integration/workspace-review.test-support'

let bundle: string
let fixture: ReviewWorkspaceFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/chat/integration/workspace-review-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
})

it('refuses a run without a running turn', async () => {
  fixture = await reviewWorkspaceFixture(bundle)
  const response = await fixture.runtime.dispatchFetch(
    `${OUTER_MACHINE_ORIGIN}${SECRET_TOOL_PATHS.run}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OUTER_TOKEN}`,
        [TOOL_TURN_HEADER]: 'ended-turn',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ names: ['TOKEN'], command: 'deploy' }),
    },
  )
  expect(response.status).toBe(403)
  expect(await response.json()).toMatchObject({
    error: { code: 'calling_turn_required' },
  })
})
