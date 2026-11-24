import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { saveGitHubTokens } from '../security/github-tokens'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { continueFixture } from './continue.test-support'
import { CONTINUE_JOB_KEY, continueJobKey } from './continue-types'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('grants the clicking member only during its fetch and expires access after completion, cancellation, or reconstruction', async () => {
  const f = await continueFixture(harness)
  for (const end of ['completion', 'cancellation', 'reconstruction'] as const) {
    await f.resetContinue()
    await f.start()
    const job = await f.advanceTo('fetch')
    await expect(f.credential(job.fetchId), end).rejects.toMatchObject({
      code: 'current_turn_required',
    })
    f.boat.commandRunning = true
    await f.coordinator.advance()
    expect(await (await f.credential(job.fetchId)).json(), end).toEqual({
      token: 'member-continue-token',
    })
    if (end === 'completion') f.boat.commandRunning = false
    if (end === 'cancellation') await f.coordinator.cancel()
    if (end === 'reconstruction') f.reconstruct()
    await expect(f.credential(job.fetchId), end).rejects.toMatchObject({
      code: 'current_turn_required',
    })
    await expect(f.credential('arbitrary-job'), end).rejects.toMatchObject({
      code: 'current_turn_required',
    })
    expect(f.boat.commands.join('\n'), end).not.toContain(
      'member-continue-token',
    )
    expect(f.boat.commands.join('\n'), end).not.toContain(
      'owner-continue-token',
    )
    f.boat.commandRunning = false
    await f.finish()
  }
})

it('refuses a Continue credential when membership ends during the real member-token refresh', async () => {
  const f = await continueFixture(harness)
  await f.start()
  const job = await f.advanceTo('fetch')
  f.boat.commandRunning = true
  await f.coordinator.advance()
  await saveGitHubTokens(
    f.env,
    f.member.id,
    {
      accessToken: 'old-token',
      expiresAt: TEST_TIME - 1,
      refreshToken: 'refresh-member',
      refreshExpiresAt: TEST_TIME + 100_000,
    },
    TEST_TIME,
  )
  const originalFetch = f.options.dependencies.fetch
  let refreshes = 0
  f.options.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname === '/login/oauth/access_token') {
      refreshes++
      await f.env.DB.prepare(
        'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
      )
        .bind(f.org.id, f.member.id)
        .run()
      return Response.json({
        access_token: 'fresh-member-token',
        expires_in: 28_800,
        refresh_token: 'fresh-refresh',
        refresh_token_expires_in: 15_552_000,
        token_type: 'bearer',
        scope: '',
      })
    }
    return originalFetch(request)
  }
  await expect(f.credential(job.fetchId)).rejects.toMatchObject({
    status: 404,
    code: 'workspace_not_found',
  })
  expect(refreshes).toBe(1)
  f.boat.commandRunning = false
  await f.finish()
})

it.each(['lost', 'missing'] as const)(
  'expires the member scope and retains journal ownership when its fetch process is %s',
  async (state) => {
    const f = await continueFixture(harness)
    await f.start()
    const job = await f.advanceTo('fetch')
    if (state === 'missing') await f.host.disconnect('bx_continue')
    f.boat.commandRunning = true
    await f.coordinator.advance()
    expect(await (await f.credential(job.fetchId)).json()).toEqual({
      token: 'member-continue-token',
    })
    const active = await f.active()
    if (!active || active.processId === null)
      throw new Error('Expected an issued fetch.')
    const processId = active.processId
    expect(active.commandRoute).toBe(state === 'lost' ? 'host' : 'provider')
    if (state === 'missing') {
      delete active.commandRoute
      await f.storage.put(continueJobKey(active.id), active)
      await f.storage.put(CONTINUE_JOB_KEY, active)
      await f.host.connect('bx_continue')
    }
    f.reconstruct()
    const original = f.options.dependencies.fetch
    const hostPolls = f.host.statusRequests.length
    let providerPolls = 0
    if (state === 'lost')
      f.host.statusReply = (_request, reply) =>
        reply.kind === 'command.status'
          ? { ...reply, state: 'lost', running: false, exitCode: null }
          : reply
    f.options.dependencies.fetch = async (request) => {
      if (new URL(request.url).pathname.endsWith(`/commands/${processId}`)) {
        providerPolls++
        return Response.json({ ok: false, code: 'not_found' }, { status: 404 })
      }
      return original(request)
    }
    await f.coordinator.advance()
    expect(await f.active()).toMatchObject({
      id: job.id,
      phase: 'fetch',
      processId: null,
      commandStarted: true,
    })
    expect(await f.active()).not.toHaveProperty('commandRoute')
    expect(f.host.statusRequests.slice(hostPolls)).toEqual(
      state === 'lost' ? [{ processId, stdoutOffset: 0, stderrOffset: 0 }] : [],
    )
    expect(providerPolls).toBe(state === 'missing' ? 1 : 0)
    await expect(f.credential(job.fetchId)).rejects.toMatchObject({
      code: 'current_turn_required',
    })
    delete f.host.statusReply
    f.boat.commandRunning = false
    await f.finish()
  },
)
