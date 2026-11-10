import { transcriptFixture } from './transcript.test-support'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import {
  sessionPath,
  sessionPaths,
  sessionTranscriptPath,
  type SessionTranscriptResponse,
} from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
  MACHINE_ORIGIN,
} from './harness.test-support'

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

it('serves the member transcript of a closed session in archived and suspended workspaces', async () => {
  const fixture = await transcriptFixture(harness)
  const session = await fixture.createSession()
  await fixture.send(
    session.id,
    'ask',
    fixture.ownerCookie,
    undefined,
    'Keep this conversation.',
  )
  await fixture.fetch(
    sessionPath(fixture.org.id, WORKSPACE_ID, session.id),
    { title: 'Saved conversation' },
    fixture.ownerCookie,
    'PATCH',
  )
  await fixture.fetch(
    sessionPaths.close(fixture.org.id, WORKSPACE_ID, session.id),
    { stopRunningTurn: true },
  )
  const path = sessionTranscriptPath(
    fixture.org.id,
    WORKSPACE_ID,
    session.id,
    'full',
  )
  const response = await fixture.fetch(path, undefined, fixture.memberCookie)
  expect(response.status).toBe(200)
  const first: SessionTranscriptResponse = await response.json()
  expect(first.markdown).toContain('# Saved conversation\n')
  expect(first.markdown).toContain('## Octocat\n\nKeep this conversation.')
  expect(first.markdown).toContain(
    `https://app.conductive.test/orgs/${fixture.org.id}/workspaces/${WORKSPACE_ID}`,
  )
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  await harness.env.DB.prepare(
    'UPDATE workspaces SET archived_at = ? WHERE id = ?',
  )
    .bind(1800000000000, WORKSPACE_ID)
    .run()
  const archived = await fixture.fetch(path)
  expect(archived.status).toBe(200)
  expect(await archived.json()).toEqual(first)
  await harness.env.DB.prepare('UPDATE orgs SET suspended_at = ? WHERE id = ?')
    .bind(1800000000000, fixture.org.id)
    .run()
  const suspended = await fixture.fetch(path)
  expect(suspended.status).toBe(200)
  expect(await suspended.json()).toEqual(first)
})

it('rejects wrong workspace membership, missing sessions, and invalid transcript detail', async () => {
  const fixture = await transcriptFixture(harness)
  const session = await fixture.createSession()
  const path = sessionTranscriptPath(
    fixture.org.id,
    WORKSPACE_ID,
    session.id,
    'full',
  )
  const invalid = await fixture.fetch(
    path.replace('detail=full', 'detail=unknown'),
  )
  expect(invalid.status).toBe(400)
  expect(await invalid.json()).toMatchObject({
    error: { code: 'invalid_input' },
  })
  expect((await fixture.fetch(path.split('?')[0])).status).toBe(400)
  const otherOrg = await harness.createOrg(fixture.memberCookie, 'Another org')
  const denied = await fixture.fetch(
    sessionTranscriptPath(otherOrg.id, WORKSPACE_ID, session.id, 'full'),
    undefined,
    fixture.memberCookie,
  )
  expect(denied.status).toBe(404)
  expect(await denied.json()).toMatchObject({
    error: { code: 'workspace_not_found' },
  })
  const other = harness.native.actor('other-workspace')
  await other.api.chat.changeWorkspace('other-workspace', async (view) =>
    view.saveSession({
      ...session,
      id: 'other-session',
      workspaceId: 'other-workspace',
    }),
  )
  for (const id of ['missing', 'other-session']) {
    const missing = await fixture.fetch(
      sessionTranscriptPath(fixture.org.id, WORKSPACE_ID, id, 'concise'),
    )
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({
      error: { code: 'session_not_found' },
    })
  }
})

it('keeps transcript reads behind browser sign-in and rejects sandbox tokens', async () => {
  const fixture = await transcriptFixture(harness)
  const session = await fixture.createSession()
  const path = sessionTranscriptPath(
    fixture.org.id,
    WORKSPACE_ID,
    session.id,
    'full',
  )
  const request = fixture.request(path)
  request.headers.delete('Cookie')
  request.headers.set('Authorization', `Bearer ${WORKSPACE_TOKEN}`)
  const unsigned = await fixture.fetchRequest(request)
  expect(unsigned.status).toBe(401)
  expect(await unsigned.json()).toMatchObject({
    error: { code: 'sign_in_required' },
  })
  const machine = new Request(`${MACHINE_ORIGIN}${path}`, {
    headers: { Authorization: `Bearer ${WORKSPACE_TOKEN}` },
  })
  expect((await fixture.fetchRequest(machine)).status).toBe(403)
  const valid = await fixture.fetch(path)
  expect(valid.status).toBe(200)
})
