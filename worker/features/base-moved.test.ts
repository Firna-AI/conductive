import { beforeAll, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { workspacePaths } from '../../src/shared/workspaces'
import { record } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { BASE_CHANGE_JOB_KEY } from '../lifecycle/base-change-job'
import { baseMoveFixture } from './base-moved.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})

it('fetches a moved base outside the banner read and leaves one growing retry across cloud failures and hibernation', async () => {
  const f = await baseMoveFixture(bundle)
  try {
    f.boat.synchronousExitCode = 1
    const moved = await f.request(f.path)
    expect(moved.status).toBe(200)
    expect(await moved.json()).toMatchObject({
      banner: { baseBranch: 'main', baseMoved: 'gone-stack' },
    })
    expect(f.boat.commandRequests).toEqual([])
    expect(await f.base()).toEqual({ base: null })
    const first = await f.pending()
    if (!first) throw new Error('Expected a saved base move.')
    const delays = [
      1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000,
      900000, 900000,
    ]
    for (const [attempt, delay] of delays.entries()) {
      const pending = await f.pending()
      if (!pending) throw new Error('The failed move lost its retry.')
      await f.control('advance', { at: pending.at })
      const next = await f.pending()
      expect(next).toMatchObject({ id: first.id, at: pending.at + delay })
      const state = await f.state()
      expect(
        [...state.keys()].filter((key) => key.startsWith('baseChange:')),
      ).toEqual([BASE_CHANGE_JOB_KEY])
      expect(state.get('alarm:baseChange')).toBe(next?.at)
      expect(
        [...state.keys()].filter((key) => key.startsWith('github-refresh:')),
      ).toEqual([])
      expect(f.fetches()).toHaveLength(attempt + 1)
    }
    expect(f.settings()).toEqual([])
    expect(
      await (
        await f.request(githubPaths.stored(OUTER_ORG, OUTER_WORKSPACE))
      ).json(),
    ).toMatchObject({
      state: { banner: { baseMoved: 'gone-stack' } },
    })
    await f.hibernate()
    const pending = await f.pending()
    expect(pending).toMatchObject({ id: first.id })
    f.boat.synchronousExitCode = 0
    const repaired = await f.request(f.path)
    expect(repaired.status).toBe(200)
    expect(await repaired.json()).toMatchObject({
      banner: { baseBranch: 'main', baseMoved: 'gone-stack' },
    })
    expect(f.settings()).toEqual([])
    await f.control('advance', { at: pending?.at })
    expect(f.settings()).toHaveLength(1)
    expect(f.settings()[0]).toMatchObject({
      detached: false,
      sandboxId: 'bx_continue',
    })
    expect(f.settings()[0].command).toContain('branch.changes.gh-merge-base')
    expect(f.settings()[0].command).toContain('refs/remotes/origin/main')
    expect(await f.pending()).toBeNull()
    expect((await f.state()).has('alarm:baseChange')).toBe(false)
    expect(record((await f.state()).get('github:state'))).not.toHaveProperty(
      'baseChange',
    )
  } finally {
    await f.dispose()
  }
})

it('repairs a failed D1 base publication from its saved marker after hibernation and an unrelated signed push', async () => {
  const f = await baseMoveFixture(bundle)
  try {
    await f.env.DB.exec(
      "CREATE TRIGGER reject_base_move BEFORE UPDATE OF base_branch ON workspaces BEGIN SELECT RAISE(ABORT, 'held base publication'); END",
    )
    expect((await f.request(f.path)).status).toBe(500)
    expect(
      await (
        await f.request(githubPaths.stored(OUTER_ORG, OUTER_WORKSPACE))
      ).json(),
    ).toMatchObject({
      state: { banner: { baseMoved: 'gone-stack' } },
    })
    expect(await f.base()).toEqual({ base: 'gone-stack' })
    expect(f.boat.commandRequests).toEqual([])
    const pending = await f.pending()
    expect(pending).toMatchObject({
      id: expect.stringMatching(/^baseChange-/),
      failures: 0,
    })
    if (!pending) throw new Error('Expected a retry before D1 publication.')
    await f.control('advance', { at: pending.at })
    expect(await f.pending()).toMatchObject({ id: pending.id, failures: 1 })
    expect(f.boat.commandRequests).toEqual([])
    await f.env.DB.exec('DROP TRIGGER reject_base_move')
    const wake = await f.hibernate()
    expect(wake.after.instance).not.toBe(wake.before.instance)
    expect(
      (await f.webhook('unrelated-branch', 'repair-base-publication')).status,
    ).toBe(204)
    expect(await f.base()).toEqual({ base: null })
    expect(f.boat.commandRequests).toEqual([])
    const retry = await f.pending()
    expect(retry).toMatchObject({ id: pending.id })
    await f.control('advance', { at: retry?.at })
    expect(f.fetches()).toHaveLength(1)
    expect(f.settings()).toHaveLength(1)
    expect(f.settings()[0].command).toContain('branch.changes.gh-merge-base')
    expect(f.settings()[0].command).toContain('refs/remotes/origin/main')
    const repaired = await f.request(f.path)
    expect(repaired.status).toBe(200)
    expect(await repaired.json()).toMatchObject({
      banner: { baseBranch: 'main', baseMoved: 'gone-stack' },
    })
    expect(await f.base()).toEqual({ base: null })
    expect(await f.pending()).toBeNull()
  } finally {
    await f.dispose()
  }
})

it('attempts the pending move on resume and keeps startup and the runner available when its fetch fails', async () => {
  const f = await baseMoveFixture(bundle)
  try {
    await f.env.DB.prepare(
      "UPDATE workspaces SET state = 'stopped' WHERE id = ?",
    )
      .bind(OUTER_WORKSPACE)
      .run()
    f.boat.states.set('bx_continue', 'archived')
    expect((await f.request(f.path)).status).toBe(200)
    await f.control('advance')
    expect(f.boat.commandRequests).toEqual([])
    const pending = await f.pending()
    if (!pending) throw new Error('Expected a pending stopped move.')
    f.boat.synchronousExitCode = 1
    const resumed = await f.request(
      workspacePaths.resume(OUTER_ORG, OUTER_WORKSPACE),
      { method: 'POST', body: '{}' },
    )
    expect(resumed.status).toBe(200)
    await f.drive(
      (state) =>
        record(state.get('lifecycle:start-job') ?? {}).phase === 'runner',
    )
    expect(f.fetches().length).toBeGreaterThan(0)
    expect(f.settings()).toEqual([])
    expect(await f.pending()).toMatchObject({ id: pending.id })
    expect(
      f.boat.commandRequests.some(
        ({ detached, command }) =>
          detached && command.includes('conductive-runner.service'),
      ),
    ).toBe(true)
    expect(f.boat.resumeIds).toEqual(['bx_continue'])
    f.boat.synchronousExitCode = 0
    const retry = await f.pending()
    await f.control('advance', { at: retry?.at })
    expect(f.settings()).toHaveLength(1)
    expect(await f.pending()).toBeNull()
  } finally {
    await f.dispose()
  }
})
