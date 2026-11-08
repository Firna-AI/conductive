import { expect, it } from 'vitest'

import type { CommandResult } from '../sandbox/provider'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuildJob } from './build-data'
import { FIRST_MESSAGE } from './durable-test-support'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { readRetention } from './retention-data'
import {
  localSavedScriptFixture,
  SAVED_BASH_SCRIPT,
} from './saved-script-test-support'
import { stopWorkspaceSandbox } from './workspace-actions'
import { createCompletedWorkspace } from './completed-creation-test-support'

const backendFixture = setupBackendTests()

async function saveScripts(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
) {
  await fixture.runtime.env.DB.prepare(
    'UPDATE settings SET install_script = ?, startup_script = ? WHERE org_id = ?',
  )
    .bind(SAVED_BASH_SCRIPT, SAVED_BASH_SCRIPT, fixture.org.id)
    .run()
}

it('runs the saved image install script in Bash with its existing directory and no org environment', async () => {
  const fixture = await backendFixture()
  const local = await localSavedScriptFixture(fixture.repositoryId, 'build')
  try {
    await saveScripts(fixture)
    const results: CommandResult[] = []
    fixture.boat.beforeCommand = async (command) => {
      if (local.contains(command, 'install')) {
        await local.writeBuildEnvironment(fixture.boat.starts.at(-1)?.env)
        results.push(await local.run(command))
      }
    }
    const id = await startImageBuild(fixture.images, {
      orgId: fixture.org.id,
      userId: fixture.user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    for (let step = 0; step < 8; step++) {
      await advanceImageBuild(fixture.images, fixture.org.id, id)
      const job = await readBuildJob(fixture.runtime.env.DB, fixture.org.id, id)
      if (job.phase === 'install' && job.processId !== null) break
    }
    expect(results).toEqual([
      {
        exitCode: 0,
        stdout: `saved script Bash's ✓|${local.directory}|unset|unset\n`,
        stderr: '',
        timedOut: false,
      },
    ])
    expect(await local.script('install')).toBe(null)
  } finally {
    await local.dispose()
  }
})

it('runs saved workspace startup in Bash with the org environment before marking ready and restarting the runner', async () => {
  const fixture = await backendFixture()
  const local = await localSavedScriptFixture(fixture.repositoryId)
  try {
    await saveScripts(fixture)
    const results: CommandResult[] = []
    fixture.boat.beforeCommand = async (command) => {
      if (local.contains(command, 'startup'))
        results.push(await local.run(command))
    }
    await fixture.run(() =>
      createCompletedWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
        repositoryId: fixture.repositoryId,
        firstMessage: FIRST_MESSAGE,
      }),
    )
    expect(results).toEqual([
      {
        exitCode: 0,
        stdout: `saved script Bash's ✓|${local.repository}|loaded value|0\n`,
        stderr: '',
        timedOut: false,
      },
    ])
    expect(await local.script('startup')).toEqual({
      text: SAVED_BASH_SCRIPT,
      mode: 0o600,
    })
    expect(await local.ready()).toBe('')
    expect(await local.runnerCalls()).toBe('runner-restarted\n')
  } finally {
    await local.dispose()
  }
})

it('runs retention startup in Bash with its org environment without marking ready or restarting the runner', async () => {
  const fixture = await backendFixture()
  const local = await localSavedScriptFixture(fixture.repositoryId, 'retention')
  try {
    await saveScripts(fixture)
    const created = await fixture.run(() =>
      createCompletedWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
        repositoryId: fixture.repositoryId,
        firstMessage: FIRST_MESSAGE,
      }),
    )
    const actor = fixture.actors.get(created.workspace.id)?.endpoint()
    if (!actor) throw new Error('Missing workspace controller')
    const context = {
      env: fixture.runtime.env,
      dependencies: fixture.runtime.dependencies,
      orgId: fixture.org.id,
      workspaceId: created.workspace.id,
    }
    await stopWorkspaceSandbox(context)
    await actor.lifecycleStopped()
    const results: CommandResult[] = []
    fixture.boat.beforeCommand = async (command) => {
      if (local.contains(command, 'retention'))
        results.push(await local.run(command))
    }
    fixture.setTime(fixture.runtime.dependencies.now() + 1_123_200_000)
    await actor.alarm()
    await actor.alarm()
    await actor.alarm()
    await actor.alarm()
    expect(results).toEqual([
      {
        exitCode: 0,
        stdout: `saved script Bash's ✓|${local.repository}|loaded value|1\n`,
        stderr: '',
        timedOut: false,
      },
    ])
    expect(await local.script('retention')).toEqual({
      text: SAVED_BASH_SCRIPT,
      mode: 0o600,
    })
    expect(await readRetention(context.env.DB, context.workspaceId)).toEqual({
      phase: 'stop',
      error: null,
    })
    expect(await local.ready()).toBe(null)
    expect(await local.runnerCalls()).toBe(null)
  } finally {
    await local.dispose()
  }
})
