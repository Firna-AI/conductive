import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { secretsPath } from '../../src/shared/secrets'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { record, string } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_TOKEN,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { chatKey } from '../chat/storage-keys'
import type { StoredTurn } from '../chat/types'
import { orgEnvironmentContext } from '../lifecycle/settings-data'
import { deriveTurnToken } from '../model-gateway/token'
import { encrypt } from '../security/crypto'
import { featureFixture, type FeatureFixture } from './fixture.test-support'
import {
  connectSkillRunner,
  path,
  requestSkill,
} from './skill-reads.test-support'

const sockets: WebSocket[] = []
let bundle: string
let fixture: FeatureFixture
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
beforeEach(async () => {
  fixture = await featureFixture(bundle)
})
afterEach(async () => {
  await closeSockets(...sockets.splice(0))
  await fixture.dispose()
})

function removeMember() {
  return fixture.env.DB.prepare(
    'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
  )
    .bind(OUTER_ORG, 'member')
    .run()
}

it('serves filtered skill text over the runner socket after hibernation', async () => {
  const secret = 'captured-environment-value'
  const ciphertext = await encrypt(
    JSON.stringify({ SECRET: { value: secret, secret: true } }),
    orgEnvironmentContext(OUTER_ORG),
    fixture.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await fixture.env.DB.prepare(
    'UPDATE workspace_runtime SET environment_ciphertext = ? WHERE workspace_id = ?',
  )
    .bind(ciphertext, OUTER_WORKSPACE)
    .run()
  const usedSecret = 'used-run-secret-value'
  const saved = await fixture.request(secretsPath(OUTER_ORG), {
    method: 'POST',
    body: JSON.stringify({
      name: 'RUN_SECRET',
      value: usedSecret,
      description: 'Used during a run',
      allAgents: false,
    }),
  })
  expect(saved.status).toBe(201)
  const savedSecret = record(record(await saved.json()).secret)
  await fixture.control('use-org-secret', {
    workspaceId: OUTER_WORKSPACE,
    secretId: string(savedSecret.id),
  })
  const gateway = { nonce: 'test-turn-token-nonce', loginVersion: 1 }
  const turn: StoredTurn = {
    id: 'past-turn',
    sessionId: 'past-session',
    senderId: 'owner',
    messageIds: [],
    state: 'finished',
    closeAfterStop: false,
    gateway,
  }
  const turnToken = await deriveTurnToken(
    { workspaceId: OUTER_WORKSPACE, turnId: turn.id },
    gateway,
    fixture.env.BOAT_KEY_ENCRYPTION_KEY,
    { agent: 'codex', kind: 'token' },
  )
  await fixture.control('seed', {
    values: { [chatKey('turn', turn.id)]: turn },
  })
  const runner = await connectSkillRunner(fixture, sockets, true)
  const wake = await fixture.hibernate()
  expect(wake.after.instance).not.toBe(wake.before.instance)
  const read = await requestSkill(fixture, runner)
  const response = await read.reply({
    ok: true,
    text: `# Release\n\n${secret}\n${OUTER_TOKEN}\ntext${turnToken}after\n${usedSecret}`,
  })
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(await response.json()).toEqual({
    text: '# Release\n\n[redacted]\n[redacted]\ntext[redacted]after\n[redacted]',
  })
  expect(fixture.boat.fileReads).toEqual([])
  expect(await fixture.control('summary')).toMatchObject({
    throughEventNumber: 1,
  })
})

it('accepts a skill at the UTF-8 limit and refuses a successful reply one byte over it', async () => {
  const runner = await connectSkillRunner(fixture, sockets, true)
  const atLimit = 'é'.repeat(524_288)
  const oversized = await requestSkill(fixture, runner)
  const rejected = await oversized.reply({ ok: true, text: `${atLimit}a` })
  expect(rejected.status).toBe(413)
  expect(await rejected.json()).toMatchObject({
    error: {
      code: 'skill_too_large',
      sizeBytes: 1_048_577,
      limitBytes: 1_048_576,
    },
  })

  const exact = await requestSkill(fixture, runner)
  const accepted = await exact.reply({ ok: true, text: atLimit })
  expect(accepted.status).toBe(200)
  expect(await accepted.json()).toEqual({ text: atLimit })
})

it('refuses foreign members and archived workspaces before reading a skill', async () => {
  const forbidden = await fixture.request(path, {
    headers: { Cookie: fixture.cookies.outsiderCookie },
  })
  expect(forbidden.status).toBe(404)
  expect(await forbidden.json()).toMatchObject({
    error: { code: 'workspace_not_found' },
  })
  await fixture.env.DB.prepare(
    "UPDATE workspaces SET state = 'archived', archived_at = 1 WHERE id = ?",
  )
    .bind(OUTER_WORKSPACE)
    .run()
  const archived = await fixture.request(path)
  expect(archived.status).toBe(404)
  expect(await archived.json()).toMatchObject({
    error: { code: 'workspace_not_found' },
  })
})

it('withholds a skill reply after the requesting member loses access', async () => {
  const runner = await connectSkillRunner(fixture, sockets, true)
  const read = await requestSkill(fixture, runner, fixture.cookies.memberCookie)
  await removeMember()
  const text = 'Private skill instructions'
  const denied = await read.reply({ ok: true, text })
  expect(denied.status).toBe(404)
  const body = await denied.text()
  expect(body).not.toContain(text)
  const withoutAccess = await fixture.request(path, {
    headers: { Cookie: fixture.cookies.memberCookie },
  })
  expect(withoutAccess.status).toBe(404)
  expect(body).toBe(await withoutAccess.text())

  const ownerRead = await requestSkill(fixture, runner)
  const allowed = await ownerRead.reply({ ok: true, text })
  expect(allowed.status).toBe(200)
  expect(await allowed.json()).toEqual({ text })
})

it('sends no skill command after the requesting member loses access before dispatch', async () => {
  const runner = await connectSkillRunner(fixture, sockets, true)
  const actor = fixture.actor()
  await actor.holdRunnerAccess()
  const pending = fixture.request(path, {
    headers: { Cookie: fixture.cookies.memberCookie },
  })
  try {
    await actor.waitForRunnerAccess()
    await removeMember()
  } finally {
    await actor.releaseRunnerAccess()
  }

  const next = runner.inbox.next()
  const outcome = await Promise.race([
    pending.then(({ status }) => ({ status })),
    next.then((command) => ({ command })),
  ])
  expect(outcome).toEqual({ status: 404 })
  expect(await (await pending).json()).toMatchObject({
    error: { code: 'workspace_not_found' },
  })
  runner.emit({ type: 'runner.ready' })
  expect(await next).toMatchObject({ type: 'confirm', throughEventNumber: 2 })
})

it('rejects an unsupported agent or a skill name outside the protocol limits', async () => {
  for (const [key, value] of [
    ['agent', 'other'],
    ['name', ''],
    ['name', 'a'.repeat(257)],
    ['name', 'two words'],
    ['name', 'a\u0000b'],
  ]) {
    const url = new URL(path, 'https://app.test')
    url.searchParams.set(key, value)
    const response = await fixture.request(`${url.pathname}${url.search}`)
    expect(response.status, key).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'invalid_input' },
    })
  }
})

it('answers a ready older runner without sending a skill command', async () => {
  const runner = await connectSkillRunner(fixture, sockets, undefined)
  const response = await fixture.request(path)
  expect(response.status).toBe(409)
  expect(await response.json()).toMatchObject({
    error: { code: 'skill_reads_unsupported' },
  })
  expect(runner.received).toMatchObject([
    { type: 'welcome' },
    { type: 'confirm' },
  ])
})

it('answers stopped and starting workspaces without a provider read or start', async () => {
  for (const state of ['stopped', 'starting']) {
    await fixture.env.DB.prepare(
      'UPDATE workspaces SET state = ?, sandbox_id = ? WHERE id = ?',
    )
      .bind(state, 'bx_skills', OUTER_WORKSPACE)
      .run()
    const response = await fixture.request(path)
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: { code: `computer_${state}` },
    })
  }
  expect(fixture.boat.sandboxReads).toEqual([])
  expect(fixture.boat.fileReads).toEqual([])
  expect(fixture.boat.resumeIds).toEqual([])
})

it('maps runner errors to public failures and keeps the size of a large skill', async () => {
  const runner = await connectSkillRunner(fixture, sockets, true)
  const cases = [
    [{ code: 'skill_not_found' }, 404],
    [{ code: 'skill_unavailable' }, 503],
    [
      { code: 'skill_too_large', sizeBytes: 1_048_577, limitBytes: 1_048_576 },
      413,
    ],
  ] as const
  for (const [error, status] of cases) {
    const read = await requestSkill(fixture, runner)
    const response = await read.reply({
      ok: false,
      error: { ...error, message: 'Private diagnostic from the runner' },
    })
    expect(response.status).toBe(status)
    const body: unknown = await response.json()
    expect(body).toMatchObject({ error })
    expect(JSON.stringify(body)).not.toContain('Private diagnostic')
  }
  const disconnected = await requestSkill(fixture, runner)
  await closeSockets(runner.socket)
  const response = await disconnected.response
  expect(response.status).toBe(503)
  expect(await response.json()).toMatchObject({
    error: { code: 'skill_unavailable' },
  })
})
