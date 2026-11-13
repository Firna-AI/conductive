import { expect, it } from 'vitest'

import { record, string } from '../chat/inputs'
import { setupBackendTests } from './backend-test-hooks'
import { advanceToRunner } from './start-resume-test-support'
import { branchGitHub, browserBranchCreate } from './start-branch.test-support'
import { workspaceResponse } from './workspace-response'
import { resumeWorkspace } from './workspace-resume'

const backend = setupBackendTests()

it.each([
  { exit: 44, branch: 'develop' },
  { exit: 45, branch: 'release/next' },
])(
  'keeps both branches through a deleted $branch failure, Try again, and resume',
  async ({ exit, branch }) => {
    const h = backend()
    const api = await branchGitHub(h)
    const response = await browserBranchCreate(h, {
      startBranch: 'develop',
      baseBranch: 'release/next',
    })
    expect(response?.status).toBe(201)
    const created = record(await response!.json())
    const id = string(record(created.workspace).id)
    const start = h.starts.get(id)
    const actor = h.actors.get(id)?.endpoint()
    if (!start || !actor) throw new Error('Missing admitted start')
    for (
      let step = 0;
      step < 8 && (await start.job())?.phase !== 'fetch';
      step++
    )
      await start.advance()
    h.boat.commandExitCode = exit
    await start.advance()
    await start.advance()
    expect(await start.wait()).toMatchObject({
      ok: false,
      error: {
        code: 'workspace_start_failed',
        message: `The branch \`${branch}\` is no longer on GitHub.`,
      },
    })
    expect(await workspaceResponse(h.runtime, h.org.id, id)).toMatchObject({
      workspace: { id, state: 'error' },
      error: { message: `The branch \`${branch}\` is no longer on GitHub.` },
    })
    const reads = api.requests.length
    api.branches.clear()
    await start.restart()
    h.boat.commandExitCode = 0
    const retry = await resumeWorkspace(h.runtime, h.org.id, id, h.user.id)
    expect(retry.workspace.id).toBe(id)
    expect(start.lastAccepted()).toMatchObject({
      startBranch: 'develop',
      baseBranch: 'release/next',
    })
    await advanceToRunner(start)
    await actor.reportRunnerLifecycle({ type: 'runner.ready' })
    await h.run(() => start.wait())
    expect(api.requests).toHaveLength(reads)
    expect(
      await h.runtime.env.DB.prepare(
        'SELECT start_branch AS startBranch, base_branch AS baseBranch FROM workspace_creation_plans WHERE workspace_id = ?',
      )
        .bind(id)
        .first(),
    ).toEqual({ startBranch: 'develop', baseBranch: 'release/next' })
    await actor.lifecycleStopped()
    h.boat.states.set('bx_2', 'archived')
    await resumeWorkspace(h.runtime, h.org.id, id, h.user.id)
    expect(start.lastAccepted()).toMatchObject({
      kind: 'resume',
      startBranch: 'develop',
      baseBranch: 'release/next',
    })
    expect(api.requests).toHaveLength(reads)
  },
)
