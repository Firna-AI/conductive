import { describe, expect, test } from 'vitest'
import type { WorkspaceStart } from '../../shared/workspaces'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { renderScreen, startedApp, textOf } from '../test-render'
import { StartingCard } from './StartingCard'

/** A create that began 6 seconds ago: one step done, and one that runs. */
const start: WorkspaceStart = {
  kind: 'create',
  startedAt: FAKE_TIME - 6_000,
  steps: [
    {
      id: 'image',
      label: 'Starting from the cloud computer of Acme',
      state: 'completed',
      startedAt: FAKE_TIME - 6_000,
      completedAt: FAKE_TIME - 2_000,
    },
    {
      id: 'branch',
      label: 'Creating branch calummoore/lisbon-7k2q',
      state: 'running',
      startedAt: FAKE_TIME - 2_000,
      completedAt: null,
    },
  ],
}

/**
 * A resume that began 9 seconds ago, whose update of the app's own software
 * failed. The start went on, so the next step runs.
 */
const updateFailed: WorkspaceStart = {
  kind: 'resume',
  startedAt: FAKE_TIME - 9_000,
  steps: [
    {
      id: 'disk',
      label: 'Resuming with your files as you left them',
      state: 'completed',
      startedAt: FAKE_TIME - 9_000,
      completedAt: FAKE_TIME - 6_000,
    },
    {
      id: 'software',
      label: 'Updating the agent and terminal software',
      state: 'failed',
      startedAt: FAKE_TIME - 6_000,
      completedAt: FAKE_TIME - 2_000,
    },
    {
      id: 'startup',
      label: 'Applying your startup script',
      state: 'running',
      startedAt: FAKE_TIME - 2_000,
      completedAt: null,
    },
  ],
}

describe('StartingCard', () => {
  test('shows each finished step with its time, and the time since the start', async () => {
    const app = await startedApp(new FakeApiServer())
    const html = renderScreen(app, <StartingCard start={start} />)
    expect(textOf(html)).toContain(
      '› Starting from the cloud computer of Acme 4s › Creating branch calummoore/lisbon-7k2q Since the start: 6s',
    )
  })

  test('ends a failed step with "failed" while the start goes on', async () => {
    const app = await startedApp(new FakeApiServer())
    const html = renderScreen(app, <StartingCard start={updateFailed} />)
    expect(textOf(html)).toContain(
      'Resuming the sandbox › Resuming with your files as you left them 3s › Updating the agent and terminal software failed › Applying your startup script Since the start: 9s',
    )
  })
})
