import { afterEach, beforeAll, expect, it } from 'vitest'
import { sessionsPath, sessionPath } from '../../src/shared/sessions'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { record, string } from '../chat/inputs'
import { chatKey } from '../chat/storage-keys'
import {
  service,
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

it('filters complete JSON fields across escapes and parts before storing the catalogue, and resolves current session provenance', async () => {
  const active = (fixture = await servicesFixture(bundle))
  await active.secret('secret-value')
  const created = await active.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'POST',
      body: JSON.stringify({
        choice: { agent: 'claude', model: 'test-claude', effort: 'high' },
      }),
    },
  )
  const sessionId = string(record(record(await created.json()).session).id)
  await active.control('seed', {
    values: {
      [chatKey('turn', 'source-turn')]: {
        id: 'source-turn',
        sessionId,
        senderId: 'owner',
        messageIds: [],
        state: 'finished',
        closeAfterStop: false,
      },
    },
  })
  const runner = await active.connect()
  const report = {
    ...snapshot,
    services: [
      {
        ...service,
        name: `very ${'😀'.repeat(90)} secret-value`,
        program: `${'😀'.repeat(38)}secret-value-after`,
        folder: `${'x'.repeat(130)}/secret-value/end`,
        originatingTurnId: 'source-turn',
        definition: {
          command: ['private-argv'],
          env: { TOKEN: 'private-env' },
        },
      },
      {
        ...service,
        serviceId: 'local',
        name: 'aaa',
        originatingTurnId: 'unknown-turn',
      },
    ],
  }
  const text = JSON.stringify(report).replaceAll(
    'secret-value',
    'secr\\u0065t-value',
  )
  const escape = text.indexOf('\\u0065')
  runner.document(
    'services.report.part',
    'split-report',
    report,
    [escape + 3, escape + 8],
    text,
  )
  await runner.fence()
  const catalogue = record(await active.catalogue())
  const result = record(catalogue.snapshot)
  expect(result.services).toEqual([
    {
      ...service,
      serviceId: 'local',
      name: 'aaa',
      source: { kind: 'local_command' },
    },
    {
      ...service,
      name: `very ${'😀'.repeat(90)} [redacted]`,
      program: `${'😀'.repeat(38)}[r`,
      folder: `…${'x'.repeat(104)}/[redacted]/end`,
      source: { kind: 'session', sessionId, title: null, agent: 'claude' },
    },
  ])
  const renamed = await active.request(
    sessionPath(OUTER_ORG, OUTER_WORKSPACE, sessionId),
    {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Current title' }),
    },
  )
  expect(renamed.status).toBe(200)
  expect(await active.catalogue()).toMatchObject({
    snapshot: { services: [{}, { source: { title: 'Current title' } }] },
  })
  const stored = JSON.stringify(
    [...(await active.state()).entries()].filter(
      ([key]) => typeof key === 'string' && key.startsWith('services:'),
    ),
  )
  expect(stored).not.toContain('secret-value')
  expect(stored).not.toContain('private-argv')
  expect(stored).not.toContain('private-env')
  expect(stored).not.toContain('definition')
})

it('keeps only current-connection reports, rejects stale revisions, replaces a boot, and restores the negotiated catalogue after hibernation', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const runner = await active.connect()
  expect(await active.catalogue()).toEqual({ state: 'unsupported' })
  runner.document('services.report.part', 'first', {
    ...snapshot,
    revision: 10,
  })
  await runner.fence()
  for (const revision of [9, 10])
    runner.document('services.report.part', `old-${revision}`, {
      ...snapshot,
      revision,
      services: [],
    })
  await runner.fence()
  expect(await active.catalogue()).toMatchObject({
    state: 'ready',
    snapshot: { revision: 10, services: [service] },
  })
  runner.send({
    type: 'services.report.part',
    transferId: 'abandoned',
    part: { partNumber: 1, finalPart: false, text: '{"bootId":' },
  })
  await runner.fence()
  const wake = await active.hibernate()
  expect(wake.before.instance).not.toBe(wake.after.instance)
  runner.send({
    type: 'services.report.part',
    transferId: 'abandoned',
    part: {
      partNumber: 2,
      finalPart: true,
      text: '"boot-one","revision":11,"services":[]}',
    },
  })
  await runner.fence()
  expect(await active.catalogue()).toMatchObject({
    state: 'ready',
    snapshot: { revision: 10 },
  })
  const replacement = await active.connect()
  expect(await active.catalogue()).toEqual({ state: 'unsupported' })
  replacement.document('services.report.part', 'repeated', {
    ...snapshot,
    revision: 10,
  })
  await replacement.fence()
  expect(await active.catalogue()).toEqual({ state: 'unsupported' })
  replacement.document('services.report.part', 'new', {
    ...snapshot,
    revision: 11,
  })
  await replacement.fence()
  expect(await active.catalogue()).toMatchObject({
    state: 'ready',
    snapshot: { revision: 11 },
  })
  replacement.document('services.report.part', 'boot', {
    ...snapshot,
    bootId: 'boot-two',
    services: [],
  })
  await replacement.fence()
  expect(await active.catalogue()).toEqual({
    state: 'ready',
    snapshot: { bootId: 'boot-two', revision: 1, services: [] },
  })
})

it('stores unlimited selected text in internal parts and discards malformed private transfers without changing numbered receipts', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const runner = await active.connect()
  const longName = '😀'.repeat(300_000)
  const report = { ...snapshot, services: [{ ...service, name: longName }] }
  const source = JSON.stringify(report)
  runner.document(
    'services.report.part',
    'large',
    report,
    [200_000, 400_000],
    source,
  )
  await runner.fence()
  expect(await active.catalogue()).toMatchObject({
    snapshot: { services: [{ name: longName }] },
  })
  runner.send({
    type: 'services.report.part',
    transferId: 'broken',
    part: { partNumber: 2, finalPart: true, text: '{}' },
  })
  runner.send({
    type: 'services.report.part',
    transferId: 'oversize',
    part: { partNumber: 1, finalPart: true, text: 'x'.repeat(1_048_576) },
  })
  runner.send({
    type: 'services.report.part',
    transferId: 'bad-json',
    part: { partNumber: 1, finalPart: true, text: 'null' },
  })
  await runner.fence()
  expect(
    runner.inbox.received.filter((value) => record(value).type === 'confirm'),
  ).toHaveLength(2)
  expect(await active.catalogue()).toMatchObject({ snapshot: { revision: 1 } })
  const values = await active.state()
  expect(
    [...values].filter(([key]) => key.startsWith('services:v1:catalogue:part:'))
      .length,
  ).toBeGreaterThan(30)
  expect(
    [...values.values()]
      .filter((value) => typeof value === 'string')
      .every((value) => typeof value === 'string' && value.length <= 16_000),
  ).toBe(true)
})
