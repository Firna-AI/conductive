import { beforeAll, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { workspacePaths } from '../../src/shared/workspaces'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { continueRoutesFixture } from './continue-routes.test-support'
import { record } from '../chat/inputs'

let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/features/continue-entry.test-support.ts',
  )
})

it('updates a running cloud computer after the base moves and repairs a stopped computer at its next resume', async () => {
  const f = await continueRoutesFixture(bundle)
  try {
    f.api.pulls = {}
    f.boat.states.set('bx_continue', 'ready')
    await f.env.DB.prepare(
      "UPDATE workspaces SET state = 'ready', base_branch = 'gone-stack' WHERE id = ?",
    )
      .bind(OUTER_WORKSPACE)
      .run()
    const path = githubPaths.banner(OUTER_ORG, OUTER_WORKSPACE)
    const moved = await f.request(path)
    expect(moved.status).toBe(200)
    expect(await moved.json()).toMatchObject({
      banner: { baseBranch: 'main', baseMoved: 'gone-stack' },
    })
    const metadata = () =>
      f.boat.commandRequests.filter(({ command }) =>
        command.includes('gh-merge-base'),
      )
    expect(metadata()).toHaveLength(1)
    expect(metadata()[0]).toMatchObject({
      detached: false,
      sandboxId: 'bx_continue',
    })
    expect(metadata()[0].command).toContain('branch.changes.gh-merge-base')
    expect(metadata()[0].command).toContain('refs/remotes/origin/main')
    await f.env.DB.prepare(
      "UPDATE workspaces SET state = 'stopped', base_branch = 'another-gone-stack' WHERE id = ?",
    )
      .bind(OUTER_WORKSPACE)
      .run()
    f.boat.states.set('bx_continue', 'archived')
    expect((await f.request(path)).status).toBe(200)
    expect(metadata()).toHaveLength(1)
    const resumed = await f.request(
      workspacePaths.resume(OUTER_ORG, OUTER_WORKSPACE),
      { method: 'POST', body: '{}' },
    )
    expect(resumed.status).toBe(200)
    await f.drive(
      (state) =>
        record(state.get('lifecycle:start-job') ?? {}).phase === 'runner',
    )
    const startup = metadata().find(({ detached }) => detached)
    expect(startup?.command).toContain('branch.changes.gh-merge-base')
    expect(startup?.command).toContain('refs/remotes/origin/main')
    expect(f.boat.resumeIds).toEqual(['bx_continue'])
  } finally {
    await f.dispose()
  }
})

it('retries a failed cloud base command from the saved banner after the workspace object rebuilds', async () => {
  const f = await continueRoutesFixture(bundle)
  try {
    f.api.pulls = {}
    f.boat.states.set('bx_continue', 'ready')
    await f.env.DB.prepare(
      "UPDATE workspaces SET state = 'ready', base_branch = 'gone-stack' WHERE id = ?",
    )
      .bind(OUTER_WORKSPACE)
      .run()
    f.boat.synchronousExitCode = 1
    const path = githubPaths.banner(OUTER_ORG, OUTER_WORKSPACE)
    expect((await f.request(path)).status).toBe(502)
    expect(
      await f.env.DB.prepare(
        'SELECT base_branch AS base FROM workspaces WHERE id = ?',
      )
        .bind(OUTER_WORKSPACE)
        .first(),
    ).toEqual({ base: null })
    expect(
      await (
        await f.request(githubPaths.stored(OUTER_ORG, OUTER_WORKSPACE))
      ).json(),
    ).toMatchObject({ state: { banner: { baseMoved: 'gone-stack' } } })
    f.boat.synchronousExitCode = 0
    await f.hibernate()
    const repaired = await f.request(path)
    expect(repaired.status).toBe(200)
    expect(await repaired.json()).toMatchObject({
      banner: { baseBranch: 'main', baseMoved: 'gone-stack' },
    })
    expect(
      f.boat.commandRequests.filter(({ command }) =>
        command.includes('gh-merge-base'),
      ),
    ).toHaveLength(2)
  } finally {
    await f.dispose()
  }
})
