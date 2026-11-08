import { expect, it } from 'vitest'

import type { CommandResult } from '../sandbox/provider'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuild, readBuildJob } from './build-data'
import { shellQuote } from './commands'
import { FIRST_MESSAGE } from './durable-test-support'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'
import { localSavedScriptFixture } from './saved-script-test-support'
import { createWorkspace } from './workspaces'

const backendFixture = setupBackendTests()

it.each([0, 7])(
  'recovers a finished install with exit code %i after a restart before its process ID was saved',
  async (exitCode) => {
    const fixture = await backendFixture()
    const { images, org, user, boat, runtime } = fixture
    const local = await localSavedScriptFixture(fixture.repositoryId, 'build')
    try {
      await runtime.env.DB.prepare(
        'UPDATE settings SET install_script = ? WHERE org_id = ?',
      )
        .bind(
          `printf 'once\\n' >> ${shellQuote(`${local.directory}/effects`)}\nprintf 'install output\\n'\nprintf 'install error\\n' >&2\nexit ${exitCode}`,
          org.id,
        )
        .run()
      const results: CommandResult[] = []
      let loseReply = true
      boat.beforeCommand = async (command) => {
        if (!local.contains(command, 'install')) return
        await local.writeBuildEnvironment(boat.starts.at(-1)?.env)
        results.push(await local.run(command))
        if (loseReply) {
          loseReply = false
          throw new Error('Lost successful command start reply')
        }
      }
      const id = await startImageBuild(images, {
        orgId: org.id,
        userId: user.id,
        kind: 'build',
        software: SOFTWARE,
      })
      for (let step = 0; step < 8; step++) {
        await advanceImageBuild(images, org.id, id)
        if (results.length === 1) break
      }
      expect(await readBuildJob(runtime.env.DB, org.id, id)).toMatchObject({
        phase: 'install',
        processId: null,
      })
      const checkpointLog = (await readBuild(runtime.env.DB, org.id, id)).log
      fixture.setTime(runtime.dependencies.now() + 1_000)
      const restarted = { ...images, dependencies: { ...images.dependencies } }
      await advanceImageBuild(restarted, org.id, id)
      expect(await local.file('effects')).toBe('once\n')
      const recoveredLog = (await readBuild(runtime.env.DB, org.id, id)).log
      expect(recoveredLog.slice(0, checkpointLog.length)).toEqual(checkpointLog)
      expect(recoveredLog).toHaveLength(checkpointLog.length + 1)
      expect(results).toEqual([
        {
          exitCode,
          stdout: 'install output\n',
          stderr: 'install error\n',
          timedOut: false,
        },
        {
          exitCode,
          stdout: 'install output\n',
          stderr: 'install error\n',
          timedOut: false,
        },
      ])
      boat.commandExitCode = results[1]?.exitCode ?? -1
      await finishImageBuild({ ...fixture, images: restarted }, id)
      expect((await readBuild(runtime.env.DB, org.id, id)).build.state).toBe(
        exitCode === 0 ? 'succeeded' : 'failed',
      )
    } finally {
      await local.dispose()
    }
  },
)

it('recovers a running startup after a lost start reply without repeating its side effect', async () => {
  const fixture = await backendFixture()
  const local = await localSavedScriptFixture(fixture.repositoryId)
  const gate = await local.gate()
  const runs: Promise<CommandResult>[] = []
  let started: () => void = () => {}
  const running = new Promise<void>((resolve) => {
    started = resolve
  })
  let followed: () => void = () => {}
  const following = new Promise<void>((resolve) => {
    followed = resolve
  })
  try {
    await fixture.runtime.env.DB.prepare(
      'UPDATE settings SET startup_script = ? WHERE org_id = ?',
    )
      .bind(
        `printf 'once\\n' >> ${shellQuote(`${local.directory}/effects`)}\nprintf 'started\\n'\nread -r proceed < ${shellQuote(gate.path)}\nprintf 'finished\\n'`,
        fixture.org.id,
      )
      .run()
    fixture.boat.beforeCommand = async (command) => {
      if (!local.contains(command, 'startup')) return
      const first = runs.length === 0
      runs.push(local.run(command, first ? started : followed))
      if (first) {
        await running
        throw new Error('Lost successful command start reply')
      }
      await following
    }
    const created = await fixture.run(() =>
      createWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
        repositoryId: fixture.repositoryId,
        firstMessage: FIRST_MESSAGE,
      }),
    )
    const start = fixture.starts.get(created.workspace.id)
    if (!start) throw new Error('Missing workspace start')
    for (let step = 0; step < 10; step++) {
      const job = await start.job()
      if (job?.phase === 'startup') break
      await start.advance()
    }
    await start.advance()
    expect(await start.job()).toMatchObject({
      phase: 'startup',
      processId: null,
    })
    expect((await start.job())?.failure).toBeUndefined()
    start.restart()
    fixture.setTime(fixture.runtime.dependencies.now() + 1_000)
    fixture.boat.commandRunning = true
    await start.advance()
    await following
    expect(await local.file('effects')).toBe('once\n')
    expect(await start.job()).toMatchObject({ phase: 'startup', processId: 3 })
    await gate.release()
    const results = await Promise.all(runs)
    expect(results.map((result) => result.stdout)).toEqual([
      'started\nfinished\n',
      'started\nfinished\n',
    ])
    fixture.boat.commandRunning = false
    await start.advance()
    await fixture.actors
      .get(created.workspace.id)
      ?.endpoint()
      .reportRunnerLifecycle({ type: 'runner.ready' })
    await start.advance()
    expect(await start.wait()).toEqual({ ok: true })
  } finally {
    await gate.release()
    await Promise.all(runs)
    await local.dispose()
  }
})
