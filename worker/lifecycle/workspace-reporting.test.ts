import { afterAll, beforeAll, expect, it } from 'vitest'

import { RUNNER_PROTOCOL_VERSION } from '../../src/shared/runner'
import { storeWorkspaceToken } from './tokens'
import { realRuntimeFixture, runtimeBundle } from './real-runtime-test-support'

let fixture: Awaited<ReturnType<typeof realRuntimeFixture>>
beforeAll(async () => {
  fixture = await realRuntimeFixture(await runtimeBundle())
})
afterAll(async () => fixture.dispose())

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Expected a reporting array.')
  return value
}

function readReports(serialized: string) {
  const input: unknown = JSON.parse(serialized)
  const events = array(input)
  const payload = events.length
    ? array(array(array(events[0])[1])[0])[1]
    : undefined
  return { events, payload }
}

it('reports an actual Workspace alarm failure and rethrows the original error', async () => {
  const result = await fixture.actor('reporting-alarm').failAlarmForReporting()
  const { events, payload } = readReports(result.events)
  expect(result.rethrown).toBe(true)
  expect(events).toHaveLength(1)
  expect(payload).toMatchObject({
    exception: {
      values: [{ type: 'TypeError', value: 'The workspace alarm failed.' }],
    },
    tags: { component: 'workspace', classification: 'workspace_alarm_failed' },
  })
  expect(JSON.stringify(events)).not.toContain('private')
  expect(JSON.stringify(events)).toContain('"/index.js"')
})

it('reports a runner callback after upgrade and keeps runner validation silent', async () => {
  const id = 'reporting-runner'
  await fixture.env.DB.prepare(
    'INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0)',
  )
    .bind(
      id,
      'runtime-org',
      'runtime-repo',
      'runtime-user',
      'Reporting workspace',
      'owner/reporting',
    )
    .run()
  await storeWorkspaceToken(fixture.env, id, 'reporting-runner-token', 1)
  const actor = fixture.actor(id)
  const runner = await fixture.openRunner(id)
  expect(runner.response.status).toBe(101)
  await actor.armReportingFailure()
  runner.send({
    type: 'hello',
    protocolVersion: RUNNER_PROTOCOL_VERSION,
    workspaceId: id,
    streamId: 'reporting-stream',
  })
  await runner.closed
  const { events: reports, payload } = readReports(
    await actor.reportingEvents(),
  )
  expect(reports).toHaveLength(1)
  expect(payload).toMatchObject({
    tags: { component: 'workspace', classification: 'runner_message_failed' },
  })
  expect(JSON.stringify(reports)).not.toContain('http.')
  expect(JSON.stringify(reports)).not.toContain('private')
  const malformed = await fixture.openRunner(id)
  expect(malformed.response.status).toBe(101)
  malformed.send({ type: 'unknown' })
  await malformed.closed
  expect(readReports(await actor.reportingEvents()).events).toHaveLength(1)
})
