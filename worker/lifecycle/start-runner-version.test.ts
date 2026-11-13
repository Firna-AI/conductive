import { expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { setupBackendTests } from './backend-test-hooks'
import { startRetryFixture } from './retry-test-support'
import { advanceToRunner, resumedStartup } from './start-resume-test-support'
import { readWorkspaceToken } from './tokens'

const fixtureForTest = setupBackendTests()

it.each(['create', 'resume'] as const)(
  'fails a %s waiting for an obsolete runner through the start cleanup path',
  async (kind) => {
    const fixture = fixtureForTest()
    const start = await (kind === 'create'
      ? startRetryFixture(fixture)
      : resumedStartup(fixture))
    await advanceToRunner(start)
    const job = await start.job()
    if (!job) throw new Error('The runner-phase start is missing.')
    const actor = fixture.actors.get(job.workspaceId)
    if (!actor) throw new Error('The workspace actor is missing.')
    const token = await readWorkspaceToken(fixture.runtime.env, job.workspaceId)
    await actor.native.api.peers.connectRunner('obsolete-runner', {
      url: `${fixture.runtime.env.MACHINE_ORIGIN}${MACHINE_PATHS.runner}`,
      headers: { Authorization: `Bearer ${token}` },
    })
    await actor.native.api.peers.receiveRunner('obsolete-runner', {
      type: 'hello',
      workspaceId: job.workspaceId,
      streamId: 'obsolete-stream',
      protocolVersion: 1,
    })
    expect(await start.job()).toMatchObject({
      phase: 'runner',
      failure: {
        code: 'runner_protocol_unsupported',
        message:
          'This cloud computer can no longer run agents. Ask an admin to build the org image again. Then start a new workspace.',
        status: 409,
        timeLimit: false,
      },
    })
    await start.advance()
    expect(await start.job()).toBeUndefined()
    expect(await start.wait()).toMatchObject({
      ok: false,
      error: {
        code: 'runner_protocol_unsupported',
        message:
          'This cloud computer can no longer run agents. Ask an admin to build the org image again. Then start a new workspace.',
      },
    })
    expect(await actor.endpoint().readLifecycle()).toMatchObject({
      state: 'error',
      runnerConnected: false,
      error: { code: 'runner_protocol_unsupported' },
    })
    expect(await actor.native.api.peers.take('obsolete-runner')).toMatchObject({
      closed: 1,
      messages: [],
    })
  },
)
