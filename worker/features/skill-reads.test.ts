import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import type { RunnerHello } from '../../src/shared/generated/RunnerHello'
import type { RunnerSkillResult } from '../../src/shared/generated/RunnerSkillResult'
import { skillContentPath } from '../../src/shared/skills'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { record, string } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_TOKEN,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  OuterFakeRunner,
  requestRunner,
} from '../chat/integration/runner-socket.test-support'
import { chatKey } from '../chat/storage-keys'
import type { StoredTurn } from '../chat/types'
import { orgEnvironmentContext } from '../lifecycle/settings-data'
import { deriveTurnToken } from '../model-gateway/token'
import { encrypt } from '../security/crypto'
import { featureFixture, type FeatureFixture } from './fixture.test-support'

const path = skillContentPath(OUTER_ORG, OUTER_WORKSPACE, {
  agent: 'codex',
  name: 'release/check',
})
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

async function connect(skillReads: RunnerHello['skillReads']) {
  const response = await requestRunner(fixture)
  expect(response.status).toBe(101)
  if (!response.webSocket) throw new Error('The runner socket is missing.')
  sockets.push(response.webSocket)
  const runner = new OuterFakeRunner(response.webSocket, OUTER_WORKSPACE, {
    skillReads,
  })
  expect(await runner.inbox.next()).toMatchObject({ type: 'welcome' })
  runner.emit({ type: 'runner.ready' })
  expect(await runner.inbox.next()).toMatchObject({ type: 'confirm' })
  return runner
}

async function requestSkill(runner: OuterFakeRunner) {
  const response = fixture.request(path)
  const command = record(
    await Promise.race([
      runner.inbox.next(),
      response.then(({ status }) => ({ status })),
    ]),
  )
  expect(command).toEqual({
    type: 'skill.read',
    requestId: expect.any(String),
    agent: 'codex',
    name: 'release/check',
    maxBytes: 1_048_576,
  })
  return {
    response,
    reply(result: RunnerSkillResult['result']) {
      runner.socket.send(
        JSON.stringify({
          type: 'skill.read.result',
          requestId: string(command.requestId),
          result,
        } satisfies RunnerSkillResult),
      )
      return response
    },
  }
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
  const runner = await connect(true)
  const wake = await fixture.hibernate()
  expect(wake.after.instance).not.toBe(wake.before.instance)
  const read = await requestSkill(runner)
  const response = await read.reply({
    ok: true,
    text: `# Release\n\n${secret}\n${OUTER_TOKEN}\ntext${turnToken}after`,
  })
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(await response.json()).toEqual({
    text: '# Release\n\n[redacted]\n[redacted]\ntext[redacted]after',
  })
  expect(fixture.boat.fileReads).toEqual([])
  expect(await fixture.control('summary')).toMatchObject({
    throughEventNumber: 1,
  })
})

it('refuses foreign members and archived workspaces before reading a skill', async () => {
  const forbidden = await fixture.request(path, {
    headers: { Cookie: fixture.cookies.outsiderCookie },
  })
  expect(forbidden.status).toBe(404)
  expect(await forbidden.json()).toMatchObject({
    error: { code: 'org_not_found' },
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
  const runner = await connect(undefined)
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
  const runner = await connect(true)
  const cases = [
    [{ code: 'skill_not_found' }, 404],
    [{ code: 'skill_unavailable' }, 503],
    [
      { code: 'skill_too_large', sizeBytes: 1_048_577, limitBytes: 1_048_576 },
      413,
    ],
  ] as const
  for (const [error, status] of cases) {
    const read = await requestSkill(runner)
    const response = await read.reply({
      ok: false,
      error: { ...error, message: 'Private diagnostic from the runner' },
    })
    expect(response.status).toBe(status)
    const body: unknown = await response.json()
    expect(body).toMatchObject({ error })
    expect(JSON.stringify(body)).not.toContain('Private diagnostic')
  }
  const disconnected = await requestSkill(runner)
  await closeSockets(runner.socket)
  const response = await disconnected.response
  expect(response.status).toBe(503)
  expect(await response.json()).toMatchObject({
    error: { code: 'skill_unavailable' },
  })
})
