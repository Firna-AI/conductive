import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  agentSessionsPath,
  agentSessionTranscriptPath,
  AGENT_TRANSCRIPT_MAX_BYTES,
} from '../../src/shared/agent-tools'
import { sessionAddressPath } from '../../src/shared/session-link'
import { sessionsPath, sessionPaths } from '../../src/shared/sessions'
import { CLAUDE } from '../chat/harness.test-support'
import { counter, record, string } from '../chat/inputs'
import { chatKey } from '../chat/storage-keys'
import {
  outerWorkerBundle,
  OUTER_MACHINE_ORIGIN,
} from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
  OUTER_TOKEN,
  OTHER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { featureFixture, type FeatureFixture } from './fixture.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

function machine(active: FeatureFixture, path: string, token = OUTER_TOKEN) {
  return active.runtime.dispatchFetch(`${OUTER_MACHINE_ORIGIN}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

function readFixture() {
  return featureFixture(bundle, {
    configuration: {
      CONDUCTIVE_MODELS: JSON.stringify([
        {
          agent: CLAUDE.agent,
          model: CLAUDE.model,
          label: 'Test Claude',
          efforts: ['high'],
        },
      ]),
    },
  })
}

async function session(active: FeatureFixture, workspaceId = OUTER_WORKSPACE) {
  const response = await active.request(sessionsPath(OUTER_ORG, workspaceId), {
    method: 'POST',
    headers: { Cookie: active.cookies.memberCookie },
    body: JSON.stringify({ choice: CLAUDE }),
  })
  expect(response.status).toBe(201)
  return string(record(record(await response.json()).session).id)
}

it('lists current and archived workspace sessions without a turn and rejects cross-org or revoked access', async () => {
  const active = (fixture = await readFixture())
  const current = await session(active)
  const closed = await session(active, OTHER_WORKSPACE)
  await active.request(sessionPaths.close(OUTER_ORG, OTHER_WORKSPACE, closed), {
    method: 'POST',
    body: JSON.stringify({ stopRunningTurn: true }),
  })
  const response = await machine(active, agentSessionsPath())
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  const listed = await response.json()
  expect(listed).toMatchObject({
    workspace: { id: OUTER_WORKSPACE, state: 'ready' },
    sessions: [
      {
        id: current,
        title: null,
        choice: CLAUDE,
        state: 'idle',
        closed: false,
        startedBy: { id: 'member' },
        link: `${active.env.APP_ORIGIN}${sessionAddressPath(OUTER_ORG, OUTER_WORKSPACE, current)}`,
      },
    ],
  })
  await active.env.DB.prepare(
    "UPDATE workspaces SET archived_at = 1, state = 'archived' WHERE id = ?",
  )
    .bind(OTHER_WORKSPACE)
    .run()
  const archived = await machine(active, agentSessionsPath(OTHER_WORKSPACE))
  expect(archived.status).toBe(200)
  expect(await archived.json()).toMatchObject({
    workspace: { id: OTHER_WORKSPACE, state: 'archived' },
    sessions: [{ id: closed, closed: true }],
  })
  expect(
    await active
      .actor()
      .listAgentSessions(OUTER_ORG, OTHER_WORKSPACE, active.env.APP_ORIGIN),
  ).toMatchObject({
    ok: false,
    error: { status: 404, code: 'workspace_not_found' },
  })
  const read = await machine(
    active,
    agentSessionTranscriptPath(OTHER_WORKSPACE, closed),
  )
  expect(read.status).toBe(200)
  const transcript = record(await read.json())
  expect(transcript.detail).toBe('concise')
  expect(transcript.markdown).toContain('# Untitled\n')
  expect(transcript.session).toEqual({
    id: closed,
    link: `${active.env.APP_ORIGIN}${sessionAddressPath(OUTER_ORG, OTHER_WORKSPACE, closed)}`,
  })
  const missing = await machine(
    active,
    agentSessionTranscriptPath(undefined, closed),
  )
  expect(missing.status).toBe(404)
  expect(await missing.json()).toMatchObject({
    error: { code: 'session_not_found' },
  })
  await active.env.DB.batch([
    active.env.DB.prepare(
      "INSERT INTO sections (id, org_id, name, position, is_default, created_at) VALUES ('foreign-section', 'other-org', 'General', 0, 1, 1)",
    ),
    active.env.DB.prepare(
      "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('foreign-repository', 'other-org', 999, 'outsider/private', 'main')",
    ),
    active.env.DB.prepare(
      "INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, section_id, name, branch, state, created_at, updated_at) VALUES ('foreign-workspace', 'other-org', 'foreign-repository', 'outsider', 'foreign-section', 'Private', 'outsider/private', 'ready', 1, 1)",
    ),
  ])
  for (const path of [
    agentSessionsPath('foreign-workspace'),
    agentSessionTranscriptPath('foreign-workspace', closed),
  ]) {
    const denied = await machine(active, path)
    expect(denied.status).toBe(404)
    expect(await denied.json()).toMatchObject({
      error: { code: 'workspace_not_found' },
    })
  }
  await active.env.DB.prepare(
    'UPDATE workspace_tokens SET revoked_at = 1 WHERE workspace_id = ?',
  )
    .bind(OUTER_WORKSPACE)
    .run()
  expect((await machine(active, agentSessionsPath())).status).toBe(401)
})

it('reports waiting turns as running and the newest failed or stopped turn accurately', async () => {
  const active = (fixture = await readFixture())
  const id = await session(active)
  const response = await active.request(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, id),
    {
      method: 'POST',
      body: JSON.stringify({
        id: 'waiting-message',
        text: 'Wait for the computer',
        choice: CLAUDE,
        attachmentIds: [],
      }),
    },
  )
  expect(response.status).toBe(202)
  const accepted = record(await response.json())
  const queued = await machine(active, agentSessionsPath())
  expect(queued.status).toBe(200)
  expect(await queued.json()).toMatchObject({
    sessions: [{ id, state: 'running' }],
  })
  const state = new Map(await active.actor().inspectFeatureState())
  const turnKey = chatKey('turn', string(record(accepted.session).activeTurnId))
  const sessionKey = chatKey('session', id)
  const turn = record(state.get(turnKey))
  await active.actor().seedFeatureState({
    [turnKey]: { ...turn, state: 'failed' },
    [sessionKey]: {
      ...record(state.get(sessionKey)),
      activeTurnId: null,
      retryMessageId: null,
    },
  })
  expect(
    await (await machine(active, agentSessionsPath())).json(),
  ).toMatchObject({ sessions: [{ id, state: 'failed' }] })
  await active
    .actor()
    .seedFeatureState({ [turnKey]: { ...turn, state: 'stopped' } })
  expect(
    await (await machine(active, agentSessionsPath())).json(),
  ).toMatchObject({ sessions: [{ id, state: 'idle' }] })
})

it('bounds serialized reads and follows continuation positions without losing oversized-line text', async () => {
  const active = (fixture = await readFixture())
  const id = await session(active)
  const original = `First line\n${'α😀\\"'.repeat(10_000)}\nLast line`
  const sent = await active.request(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, id),
    {
      method: 'POST',
      body: JSON.stringify({
        id: 'long-message',
        text: original,
        choice: CLAUDE,
        attachmentIds: [],
      }),
    },
  )
  expect(sent.status).toBe(202)
  const path = agentSessionTranscriptPath(undefined, id)
  const newestResponse = await machine(active, `${path}?detail=full`)
  expect(newestResponse.status).toBe(200)
  const newestText = await newestResponse.text()
  expect(new TextEncoder().encode(newestText).length).toBeLessThanOrEqual(
    AGENT_TRANSCRIPT_MAX_BYTES,
  )
  const newest = record(JSON.parse(newestText))
  expect(newest.markdown).toContain('Last line')
  expect(newest.startLine).toBeGreaterThan(1)
  let start = { line: 1, offset: 0 }
  let restored = ''
  let fragments = 0
  for (let page = 0; page < 20; page++) {
    const response = await machine(
      active,
      `${path}?detail=full&startLine=${start.line}&startOffset=${start.offset}`,
    )
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(
      AGENT_TRANSCRIPT_MAX_BYTES,
    )
    const result = record(JSON.parse(text))
    const markdown = string(result.markdown)
    expect(markdown.length).toBeGreaterThan(0)
    expect(result.detail).toBe('full')
    restored += markdown
    if (result.next === null) break
    const next = record(result.next)
    const position = { line: counter(next.line), offset: counter(next.offset) }
    fragments += Number(position.offset > 0)
    expect(position.line > start.line || position.offset > start.offset).toBe(
      true,
    )
    start = position
  }
  expect(restored).toContain(original)
  expect(fragments).toBeGreaterThan(0)
})
