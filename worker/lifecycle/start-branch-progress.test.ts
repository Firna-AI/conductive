import { expect, it } from 'vitest'

import { record, string } from '../chat/inputs'
import { setupBackendTests } from './backend-test-hooks'
import { branchGitHub, browserBranchCreate } from './start-branch.test-support'
import { advanceToRunner } from './start-resume-test-support'

const backend = setupBackendTests()

it.each([
  {
    input: { startBranch: 'develop', baseBranch: 'main' },
    label: 'Fetching develop of repository',
  },
  { input: {}, label: 'Fetching the default branch' },
])(
  'reports $label for a create targeting the default',
  async ({ input, label }) => {
    const h = backend()
    await branchGitHub(h)
    const response = await browserBranchCreate(h, input)
    expect(response?.status).toBe(201)
    const id = string(record(record(await response!.json()).workspace).id)
    const start = h.starts.get(id)
    const actor = h.actors.get(id)?.endpoint()
    if (!start || !actor) throw new Error('Missing admitted start')
    for (
      let step = 0;
      step < 8 && (await start.job())?.phase !== 'fetch';
      step++
    )
      await start.advance()
    expect(await start.job()).toMatchObject({
      phase: 'fetch',
      baseBranch: undefined,
    })
    await start.advance()
    expect((await actor.readLifecycle())?.start?.steps).toContainEqual(
      expect.objectContaining({ id: 'fetch', label, state: 'running' }),
    )
    await advanceToRunner(start)
    expect((await actor.readLifecycle())?.start?.steps).toContainEqual(
      expect.objectContaining({ id: 'fetch', label, state: 'completed' }),
    )
  },
)
