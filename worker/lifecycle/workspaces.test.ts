import { expect, it } from 'vitest'

import { encrypt } from '../security/crypto'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { retrySandboxCleanup } from './cleanup'
import { FIRST_MESSAGE } from './durable-test-support'
import { orgEnvironmentContext } from './settings-data'
import { createWorkspace } from './workspaces'
import { resumeWorkspace } from './workspace-resume'

const backendFixture = setupBackendTests()

it('removes a failed create and its token while retaining the draft and cleanup ownership', async () => {
  const fixture = await backendFixture()
  try {
    const { runtime, org, user, boat } = fixture
    boat.commandExitCode = 1
    boat.deleteFailures = 1
    boat.lostCreateReplies = 1
    boat.afterLostCreate = async () => {
      await runtime.env.DB.batch([
        runtime.env.DB.prepare(
          'INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES (?, 29, ?, 0, 0)',
        ).bind('reassigned-user', 'new-owner'),
        runtime.env.DB.prepare(
          "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'member', 0)",
        ).bind(org.id, 'reassigned-user'),
        runtime.env.DB.prepare(
          'UPDATE workspaces SET owner_user_id = ? WHERE org_id = ?',
        ).bind('reassigned-user', org.id),
      ])
    }
    const input = {
      repositoryId: fixture.repositoryId,
      firstMessage: structuredClone(FIRST_MESSAGE),
    }
    await expect(
      fixture.run(() => createWorkspace(runtime, org.id, user, input)),
    ).rejects.toMatchObject({ code: 'workspace_cleanup_pending' })
    expect(input.firstMessage).toEqual(FIRST_MESSAGE)
    expect(boat.starts[1]).toEqual(boat.starts[0])
    const failed = await fixture.failedCreation('lifecycle-1')
    input.firstMessage.text = 'The browser closed and lost its draft.'
    expect(failed).toMatchObject({
      orgId: org.id,
      senderUserId: user.id,
      request: { text: 'Keep the first draft.' },
    })
    expect(
      await runtime.env.DB.prepare(
        'SELECT state FROM workspace_creation_attempts WHERE workspace_id = ?',
      )
        .bind('lifecycle-1')
        .first('state'),
    ).toBe('failed')
    input.firstMessage.text = FIRST_MESSAGE.text
    expect(
      await runtime.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM workspaces',
      ).first('count'),
    ).toBe(0)
    expect(
      await runtime.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM workspace_tokens',
      ).first('count'),
    ).toBe(0)
    expect(
      await runtime.env.DB.prepare(
        'SELECT workspace_id AS id FROM lifecycle_sandbox_cleanup',
      ).first('id'),
    ).toBe('lifecycle-1')
    expect(fixture.actors.get('lifecycle-1')?.storage.alarmAt).not.toBe(null)
    expect(
      await retrySandboxCleanup(
        runtime.env,
        runtime.dependencies,
        'lifecycle-1',
      ),
    ).toBe(true)
    expect(
      await runtime.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM lifecycle_sandbox_cleanup',
      ).first('count'),
    ).toBe(0)
    boat.commandExitCode = 0
    const created = await fixture.run(() =>
      createWorkspace(runtime, org.id, user, input),
    )
    const retry = await fixture.run(() =>
      createWorkspace(runtime, org.id, user, input),
    )
    expect(retry.workspace.id).toBe(created.workspace.id)
    expect(created.workspace.branch).toMatch(/^octocat\/[a-z]+-[a-z0-9]{4}$/)
    expect(created.first.request).toEqual(FIRST_MESSAGE)
    expect(
      await runtime
        .workspace(created.workspace.id)
        .credentialSender(created.first.turnId),
    ).toBe(user.id)
    expect(boat.starts.at(-1)).toMatchObject({
      from: 'last-good-image',
      noEnv: true,
      labels: {
        user: user.id,
        repository: fixture.repositoryId,
        workspace: created.workspace.id,
        org: org.id,
      },
    })
    expect(boat.commands[1]).toContain(
      `export CONDUCTING_TURN_ID='${created.first.turnId}'`,
    )
  } finally {
    await fixture.dispose()
  }
})

it('resumes the same disk and retries a failed startup on its already running machine', async () => {
  const fixture = await backendFixture()
  try {
    const { runtime, org, user, boat } = fixture
    const ciphertext = await encrypt(
      JSON.stringify({
        APP_SECRET: 'org-secret',
        CONDUCTING_USER_SETTING: 'keep-this',
        CONDUCTING_MACHINE_ORIGIN: 'https://evil.test',
      }),
      orgEnvironmentContext(org.id),
      runtime.env.BOAT_KEY_ENCRYPTION_KEY,
    )
    await runtime.env.DB.prepare(
      'UPDATE settings SET env_vars_ciphertext = ? WHERE org_id = ?',
    )
      .bind(ciphertext, org.id)
      .run()
    const created = await fixture.run(() =>
      createWorkspace(runtime, org.id, user, {
        repositoryId: fixture.repositoryId,
        firstMessage: FIRST_MESSAGE,
      }),
    )
    const endpoint = runtime.workspace(created.workspace.id)
    await endpoint.lifecycleStopped()
    boat.states.set('bx_1', 'archiving')
    let reads = 0
    boat.beforeSandboxRead = async (id) => {
      if (++reads === 2) {
        boat.states.set(id, 'archived')
        boat.beforeSandboxRead = undefined
      }
    }
    fixture.setTime(TEST_TIME + 5_000_000)
    boat.commands.length = 0
    boat.commandExitCode = 1
    boat.commandOutput = 'failed org-secret'
    boat.statusChunkSize = 8
    boat.beforeStatus = async () => {
      boat.beforeStatus = undefined
      const changed = await encrypt(
        JSON.stringify({ APP_SECRET: 'new-org-secret' }),
        orgEnvironmentContext(org.id),
        runtime.env.BOAT_KEY_ENCRYPTION_KEY,
      )
      await runtime.env.DB.prepare(
        'UPDATE settings SET env_vars_ciphertext = ? WHERE org_id = ?',
      )
        .bind(changed, org.id)
        .run()
    }
    await expect(
      fixture.run(() =>
        resumeWorkspace(runtime, org.id, created.workspace.id, user.id),
      ),
    ).rejects.toMatchObject({
      code: 'workspace_start_failed',
      log: { text: 'failed [hidden]' },
    })
    expect(boat.resumeIds).toEqual(['bx_1'])
    expect(
      (
        await fixture.starts.get(created.workspace.id)?.storedCiphertexts()
      )?.join(''),
    ).not.toContain('org-secret')
    boat.commandExitCode = 0
    fixture.setTime(TEST_TIME + 5_000_000)
    await fixture.run(() =>
      resumeWorkspace(runtime, org.id, created.workspace.id, user.id),
    )
    const actor = fixture.actors.get(created.workspace.id)?.endpoint()
    if (!actor) throw new Error('Missing production controller')
    await actor.reportRunnerLifecycle({ type: 'runner.ready' })
    const stale = fixture.starts.get(created.workspace.id)?.lastAccepted()
    if (!stale) throw new Error('Missing accepted resume')
    const commandCount = boat.commands.length
    expect(await endpoint.queueLifecycleStart(stale)).toBe(false)
    expect(boat.commands).toHaveLength(commandCount)
    expect(boat.resumeIds).toEqual(['bx_1'])
    expect(boat.deletedIds).toEqual([])
    expect(
      boat.commands.every(
        (command) => !/git (fetch|checkout|reset|clone)/.test(command),
      ),
    ).toBe(true)
    expect(boat.starts[0]).toMatchObject({
      env: {
        CONDUCTING_USER_SETTING: 'keep-this',
        CONDUCTING_MACHINE_ORIGIN: 'https://machine.conducting.test',
      },
    })
    expect(await endpoint.readLifecycle()).toMatchObject({
      state: 'ready',
      lastActivityAt: TEST_TIME + 5_000_000,
      pendingFirstMessage: FIRST_MESSAGE,
    })
  } finally {
    await fixture.dispose()
  }
})
