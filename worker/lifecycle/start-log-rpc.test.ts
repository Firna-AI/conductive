import { beforeAll, expect, it } from 'vitest'

import { encrypt } from '../security/crypto'
import { claimCreation } from './creation-claims'
import { FIRST_MESSAGE } from './durable-test-support'
import { MaskedStartLog } from './masked-start-log'
import { realRuntimeFixture, runtimeBundle } from './real-runtime-test-support'
import { orgEnvironmentContext } from './settings-data'
import type { WorkspaceStartJob } from './start-types'
import { workspaceResponse } from './workspace-response'
import { workspaceLifecycleEndpoint } from './workspace-transport'
import { readSavedScript } from './saved-script'
import { serializeStartJob } from './start-job-codec'

let bundle: string
beforeAll(async () => {
  bundle = await runtimeBundle()
})

it('keeps failure logs masked across Worker RPC and storage reloads', async () => {
  const fixture = await realRuntimeFixture(bundle)
  try {
    const id = 'runtime-log-workspace'
    const environmentCiphertext = await encrypt(
      JSON.stringify({ APP_SECRET: 'rpc-secret' }),
      orgEnvironmentContext('runtime-org'),
      fixture.env.BOAT_KEY_ENCRYPTION_KEY,
    )
    const user = {
      id: 'runtime-user',
      githubId: 11,
      githubLogin: 'octocat',
      displayName: null,
      avatarUrl: null,
    }
    const job: WorkspaceStartJob = {
      workspaceId: id,
      orgId: 'runtime-org',
      kind: 'create',
      imageName: 'base-runtime-image',
      startupScript: readSavedScript(''),
      environmentCiphertext,
      defaultBranch: 'main',
      turnId: 'runtime-log-turn',
      attempt: 'runtime-log-create',
      phase: 'records',
      processId: null,
      stdoutOffset: 0,
      stderrOffset: 0,
      creation: {
        user,
        sender: user,
        repositoryId: 'runtime-repo',
        city: 'lisbon',
        branch: 'octocat/lisbon-logs',
        sessionId: 'runtime-log-session',
        request: FIRST_MESSAGE,
        createdAt: Date.now(),
      },
    }
    await claimCreation(
      fixture.env.DB,
      {
        orgId: job.orgId,
        senderUserId: user.id,
        messageId: FIRST_MESSAGE.id,
      },
      job,
    )
    const actor = fixture.actor(id)
    expect(await actor.queueLifecycleStart(serializeStartJob(job))).toBe(true)
    for (let step = 0; step < 20 && (await actor.checkpoint()); step++) {
      if ((await actor.checkpoint())?.phase === 'runner')
        await actor.reportRunnerLifecycle({ type: 'runner.ready' })
      await actor.tick()
    }
    expect(await actor.waitCreationLifecycle()).toEqual({ ok: true })
    await actor.lifecycleStopped()
    fixture.boat.commandOutput = 'failed rpc-secret'
    fixture.boat.commandExitCode = 1
    expect(
      await actor.queueLifecycleStart(
        serializeStartJob({
          ...job,
          kind: 'resume',
          phase: 'machine',
          attempt: 'runtime-log-resume',
          creation: undefined,
          allocatedSandboxId: 'bx_1',
        }),
      ),
    ).toBe(true)
    for (let step = 0; step < 20 && (await actor.checkpoint()); step++)
      await actor.tick()
    const endpoint = workspaceLifecycleEndpoint(actor, fixture.env)
    const result = await endpoint
      .waitLifecycleStart()
      .catch((error: unknown) => error)
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'workspace_start_failed',
        log: { text: 'failed [hidden]' },
      },
    })
    expect(result).toMatchObject({
      error: { log: expect.any(MaskedStartLog) },
    })
    expect(await endpoint.readLifecycleStartLog()).toBeInstanceOf(
      MaskedStartLog,
    )
    expect(
      (
        await workspaceResponse(
          {
            env: fixture.env,
            dependencies: {
              fetch: fixture.boat.fetch,
              now: Date.now,
              randomToken: () => '',
            },
            workspace: () => endpoint,
          },
          job.orgId,
          id,
        )
      ).error?.log,
    ).toBe('failed [hidden]')
    expect(JSON.stringify(await actor.waitLifecycleStart())).not.toContain(
      'rpc-secret',
    )
    await fixture.restart()
    const restored = workspaceLifecycleEndpoint(fixture.actor(id), fixture.env)
    expect(await restored.readLifecycleStartLog()).toMatchObject({
      text: 'failed [hidden]',
    })
    expect(await restored.waitLifecycleStart()).toMatchObject({
      ok: false,
      error: { log: { text: 'failed [hidden]' } },
    })
  } finally {
    await fixture.dispose()
  }
})
