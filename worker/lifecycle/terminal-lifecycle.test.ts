import { expect, it } from 'vitest'

import { terminalPassword } from '../terminal/credentials'
import { TERMINAL_RUNTIME } from '../terminal/scripts'
import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { DISK_KEEPALIVE_MS } from './durable-types'
import { stopWorkspaceSandbox } from './workspace-actions'
import { openWorkspace } from './workspace-resume'
import { createWorkspace } from './workspaces'

const backendFixture = setupBackendTests()

it('starts and caches the terminal after startup at create and resume while retention starts no terminal', async () => {
  const fixture = await backendFixture()
  const { runtime, org, user, boat } = fixture
  const queued = fixture.nextQueued()
  const creation = createWorkspace(runtime, org.id, user, {
    repositoryId: fixture.repositoryId,
    firstMessage: FIRST_MESSAGE,
  })
  void creation.catch(() => {})
  const id = await queued
  const coordinator = fixture.starts.get(id)
  if (!coordinator) throw new Error('Missing workspace start')
  const endpoint = fixture.actors.get(id)?.endpoint()
  if (!endpoint) throw new Error('Missing workspace controller')
  let terminalStarts = 0
  boat.beforeCommand = async (command, detached) => {
    if (detached) return
    if (!command.includes('systemctl start conductive-terminal.service')) return
    terminalStarts++
    await endpoint.reportRunnerLifecycle({ type: 'runner.ready' })
    expect(await endpoint.readLifecycle()).toMatchObject({
      state: 'starting',
      startupPrepared: false,
      start: {
        steps: expect.arrayContaining([
          {
            id: 'startup',
            label: 'Applying your startup script',
            state: 'running',
            startedAt: expect.any(Number),
            completedAt: null,
          },
        ]),
      },
    })
    expect(boat.commandRequests.at(-2)).toMatchObject({
      detached: true,
      command: expect.stringContaining("bash '/run/conductive/startup.sh'"),
    })
  }
  for (let step = 0; step < 16; step++) {
    const job = await coordinator.job()
    if (job?.phase === 'startup' && job.processId !== null) break
    await coordinator.advance()
  }
  expect(await coordinator.job()).toMatchObject({ phase: 'startup' })
  boat.commandRunning = true
  await coordinator.advance()
  expect(terminalStarts).toBe(0)
  expect(boat.fileReads).toEqual([])
  expect((await endpoint.readLifecycle())?.startupPrepared).toBe(false)
  boat.commandRunning = false
  await coordinator.advance()
  expect((await creation).workspace.state).toBe('starting')
  expect((await endpoint.readLifecycle())?.state).toBe('ready')
  expect(terminalStarts).toBe(1)
  expect(boat.fileReads).toEqual([`${TERMINAL_RUNTIME}/password`])
  expect(await terminalPassword(runtime.env, id, 'bx_1')).toBe('b'.repeat(64))

  const context = {
    env: runtime.env,
    dependencies: runtime.dependencies,
    orgId: org.id,
    workspaceId: id,
  }
  await stopWorkspaceSandbox(context)
  await endpoint.lifecycleStopped()
  fixture.setTime(runtime.dependencies.now() + DISK_KEEPALIVE_MS)
  for (let step = 0; step < 5; step++) await endpoint.alarm()
  expect((await endpoint.readLifecycle())?.state).toBe('stopped')
  expect(boat.resumeIds).toEqual(['bx_1'])
  expect(terminalStarts).toBe(1)
  expect(boat.fileReads).toEqual([`${TERMINAL_RUNTIME}/password`])

  boat.terminalPassword = 'c'.repeat(64)
  const resumed = await fixture.run(() =>
    openWorkspace(runtime, org.id, id, user.id, 'terminal-resume'),
  )
  expect(resumed.workspace.state).toBe('ready')
  expect(terminalStarts).toBe(2)
  expect(await terminalPassword(runtime.env, id, 'bx_1')).toBe('c'.repeat(64))
  expect(boat.fileReads).toEqual([
    `${TERMINAL_RUNTIME}/password`,
    `${TERMINAL_RUNTIME}/password`,
  ])
  expect(boat.commands.join('\n')).not.toContain(boat.terminalPassword)
})
