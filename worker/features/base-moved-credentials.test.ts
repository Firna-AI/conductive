import { beforeAll, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_TOKEN,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { baseMoveFixture } from './base-moved.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})

it('maps a webhook move only to the owner during its fetch and keeps a denied fetch pending without exposing a token', async () => {
  const logs: string[] = []
  const f = await baseMoveFixture(bundle, {
    handleStructuredLogs: (event) => {
      logs.push(JSON.stringify(event))
    },
  })
  try {
    await f.env.DB.prepare(
      'UPDATE workspace_tokens SET revoked_at = NULL WHERE workspace_id = ?',
    )
      .bind(OUTER_WORKSPACE)
      .run()
    expect((await f.webhook('gone-stack', 'owner-base-fetch')).status).toBe(204)
    const pending = await f.pending()
    if (!pending) throw new Error('Expected the webhook to save a base move.')
    expect((await f.credential(OUTER_TOKEN, pending.id)).status).toBe(409)
    const granted: unknown[] = []
    const revoked: number[] = []
    let denyOwner = true
    f.boat.beforeCommand = async (command) => {
      if (command.includes('conductive-git-credential')) {
        const response = await f.credential(OUTER_TOKEN, pending.id)
        expect(response.status).toBe(200)
        granted.push(await response.json())
        f.boat.synchronousExitCode = denyOwner ? 1 : 0
      } else {
        revoked.push((await f.credential(OUTER_TOKEN, pending.id)).status)
      }
    }
    await f.control('advance', { at: pending.at })
    expect(granted).toEqual([{ token: 'owner-continue-token' }])
    expect(f.settings()).toEqual([])
    expect(await f.pending()).toMatchObject({ id: pending.id, failures: 1 })
    const banner = await f.request(
      githubPaths.banner(OUTER_ORG, OUTER_WORKSPACE),
    )
    expect(banner.status).toBe(200)
    expect(await banner.json()).toMatchObject({
      banner: { baseBranch: 'main', baseMoved: 'gone-stack' },
    })
    expect((await f.credential(OUTER_TOKEN, pending.id)).status).toBe(409)
    await f.hibernate()
    expect((await f.credential(OUTER_TOKEN, pending.id)).status).toBe(409)
    denyOwner = false
    const retry = await f.pending()
    await f.control('advance', { at: retry?.at })
    expect(granted).toEqual([
      { token: 'owner-continue-token' },
      { token: 'owner-continue-token' },
    ])
    expect(revoked).toEqual([409])
    expect(f.settings()).toHaveLength(1)
    expect(await f.pending()).toBeNull()
    expect((await f.credential(OUTER_TOKEN, pending.id)).status).toBe(409)
    expect(
      (await f.credential(OUTER_TOKEN, 'baseChange-invented')).status,
    ).toBe(409)
    const commands = f.boat.commandRequests
      .map(({ command }) => command)
      .join('\n')
    const state = JSON.stringify([...(await f.state())])
    for (const token of ['owner-continue-token', 'member-continue-token']) {
      expect(commands).not.toContain(token)
      expect(state).not.toContain(token)
      expect(logs.join('\n')).not.toContain(token)
      expect(
        JSON.stringify(await (await f.request(f.path)).json()),
      ).not.toContain(token)
    }
  } finally {
    await f.dispose()
  }
})
