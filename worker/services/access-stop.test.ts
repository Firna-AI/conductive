import { afterEach, beforeAll, expect, it } from 'vitest'
import { servicePaths } from '../../src/shared/services'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { record, string } from '../chat/inputs'
import {
  observed,
  restart,
  servicesFixture,
  snapshot,
  type ServicesFixture,
} from './fixture.test-support'

let bundle: string
let fixture: ServicesFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('checks workspace read reach and header Restart control access, including suspended orgs and owners and nonrunning computers', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  const log = { requestId: 'access-log', target: observed }
  for (const path of [
    active.paths.catalogue,
    active.paths.control,
    active.paths.logs,
  ]) {
    const response =
      path === active.paths.catalogue
        ? await active.request(path, {
            headers: { Cookie: active.cookies.outsiderCookie },
          })
        : await active.post(
            path,
            path === active.paths.logs ? log : restart,
            active.cookies.outsiderCookie,
          )
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: 'workspace_not_found' },
    })
  }
  for (const path of [
    servicePaths.catalogue('other-org', OUTER_WORKSPACE),
    servicePaths.catalogue(OUTER_ORG, 'missing'),
  ]) {
    const response = await active.request(path)
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: 'workspace_not_found' },
    })
  }
  expect(await active.catalogue()).toMatchObject({ state: 'ready' })
  await active.env.DB.prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
    .bind(OUTER_ORG)
    .run()
  expect(
    (
      await active.request(active.paths.catalogue, {
        headers: { Cookie: active.cookies.memberCookie },
      })
    ).status,
  ).toBe(200)
  expect((await active.post(active.paths.logs, log)).status).toBe(200)
  const org = await active.post(active.paths.control, restart)
  expect(org.status).toBe(403)
  expect(await org.json()).toMatchObject({ error: { code: 'org_suspended' } })
  await active.env.DB.prepare(
    'UPDATE orgs SET suspended_at = NULL WHERE id = ?',
  )
    .bind(OUTER_ORG)
    .run()
  await active.env.DB.prepare(
    "UPDATE users SET suspended_at = 1 WHERE id = 'owner'",
  ).run()
  expect(
    (
      await active.request(active.paths.catalogue, {
        headers: { Cookie: active.cookies.memberCookie },
      })
    ).status,
  ).toBe(200)
  expect((await active.post(active.paths.logs, log)).status).toBe(200)
  const owner = await active.post(active.paths.control, restart)
  expect(owner.status).toBe(403)
  expect(await owner.json()).toMatchObject({
    error: { code: 'user_suspended' },
  })
  await active.env.DB.prepare(
    "UPDATE users SET suspended_at = NULL WHERE id = 'owner'",
  ).run()
  await active.env.DB.prepare(
    "UPDATE workspaces SET state = 'stopped', sandbox_id = NULL WHERE id = ?",
  )
    .bind(OUTER_WORKSPACE)
    .run()
  expect(await active.catalogue()).toEqual({ state: 'stopped' })
  const stopped = await active.post(active.paths.control, restart)
  expect(stopped.status).toBe(409)
  expect(await stopped.json()).toMatchObject({
    error: { code: 'sandbox_not_ready' },
  })
  expect(
    runner.inbox.received.filter(
      (value) => record(value).type === 'services.control',
    ),
  ).toEqual([])
})

it('clears the catalogue and all pending operations on computer stop and never reuses the snapshot or controls after resume', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const beforeStop = await active.state()
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  const control = active.post(active.paths.control, restart)
  expect(record(await runner.inbox.next()).type).toBe('services.control')
  const log = { requestId: 'stop-log', target: observed }
  const logs = active.post(active.paths.logs, log)
  const logCommand = record(await runner.inbox.next())
  expect(logCommand.type).toBe('services.logs')
  runner.send({
    type: 'services.logs.part',
    requestId: record(logCommand.request).requestId,
    part: { partNumber: 1, finalPart: false, text: '{"private":' },
  })
  await runner.fence()
  await active.control('stopped')
  expect(await (await control).json()).toEqual({
    request: restart,
    outcome: { state: 'computer_stopped' },
  })
  expect(await (await logs).json()).toEqual({
    request: log,
    result: { state: 'unavailable' },
  })
  expect(await active.catalogue()).toEqual({ state: 'stopped' })
  expect(
    [...(await active.state()).keys()].filter((key) =>
      key.startsWith('services:v1:catalogue'),
    ),
  ).toEqual([])
  expect(
    [...(await active.state()).keys()].filter((key) =>
      key.startsWith('services:v1:control:'),
    ),
  ).toEqual([])
  await active.env.DB.prepare(
    "UPDATE workspaces SET state = 'ready', sandbox_id = 'bx_services_new' WHERE id = ?",
  )
    .bind(OUTER_WORKSPACE)
    .run()
  await active.control('seed', {
    values: { 'lifecycle:state': beforeStop.get('lifecycle:state') },
  })
  const replacement = await active.connect()
  expect(await active.catalogue()).toEqual({ state: 'unsupported' })
  replacement.document('services.report.part', 'new-boot', {
    ...snapshot,
    bootId: 'resumed-boot',
    services: [],
  })
  await replacement.fence()
  expect(await active.catalogue()).toEqual({
    state: 'ready',
    snapshot: { bootId: 'resumed-boot', revision: 1, services: [] },
  })
  expect(
    await (await active.post(active.paths.control, restart)).json(),
  ).toEqual({ request: restart, outcome: { state: 'stale' } })
  expect(
    replacement.inbox.received.filter(
      (value) => record(value).type === 'services.control',
    ),
  ).toEqual([])
})

it('adds no activity, turns, or idle deadline changes for reports, catalogue reads, Stop, Restart, control results, and logs', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const runner = await active.connect()
  await runner.fence()
  await active.env.DB.prepare('UPDATE users SET last_active_at = NULL').run()
  const before = await active.state()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  expect(await active.catalogue()).toMatchObject({ state: 'ready' })
  for (const action of ['stop', 'restart']) {
    const request = { ...restart, requestId: action, action }
    const result = active.post(active.paths.control, request)
    expect(record(await runner.inbox.next()).type).toBe('services.control')
    runner.document('services.control.result.part', request.requestId, {
      request,
      outcome: { state: 'applied' },
    })
    expect((await result).status).toBe(200)
  }
  const request = { requestId: 'activity-log', target: observed }
  const logs = active.post(active.paths.logs, request)
  const runnerRequest = record(record(await runner.inbox.next()).request)
  runner.document('services.logs.part', string(runnerRequest.requestId), {
    request: runnerRequest,
    result: { state: 'ready', text: 'service output', omitted: false },
  })
  expect((await logs).status).toBe(200)
  const after = await active.state()
  expect(after.get('lifecycle:state')).toEqual(before.get('lifecycle:state'))
  expect([...after].filter(([key]) => key.startsWith('alarm:'))).toEqual(
    [...before].filter(([key]) => key.startsWith('alarm:')),
  )
  expect([...after].filter(([key]) => key.startsWith('chat:v1:turn:'))).toEqual(
    [...before].filter(([key]) => key.startsWith('chat:v1:turn:')),
  )
  const rows = await active.env.DB.prepare(
    'SELECT last_active_at AS at FROM users',
  ).all()
  expect(rows.results.map((row) => row.at)).toEqual([null, null, null])
})
