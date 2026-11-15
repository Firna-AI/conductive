import { afterAll, beforeAll, expect, it } from 'vitest'

import { record, text } from '../../tools/input'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { CLAUDE } from '../chat/harness.test-support'
import { OUTER_WORKSPACE } from '../chat/integration/outer-seed.test-support'
import {
  sessionToolFixture,
  type SessionToolFixture,
} from './session-test-support'

let fixture: SessionToolFixture
let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
beforeAll(async () => {
  fixture = await sessionToolFixture(bundle, {
    configuration: {
      CONDUCTIVE_MODELS: JSON.stringify([
        { ...CLAUDE, label: 'Claude', efforts: ['high'], fast: true },
      ]),
    },
  })
})
afterAll(async () => {
  await fixture.dispose()
})

it('requires fast for a tool session create and keeps session speed on a send without fast', async () => {
  await fixture.env.DB.prepare(
    "INSERT OR REPLACE INTO user_preferences (user_id, default_agent, default_model, default_effort, default_fast, updated_at) VALUES ('member', 'claude', ?, 'high', 1, 1)",
  )
    .bind(CLAUDE.model)
    .run()
  const plain = await fixture.cli(['create'])
  expect(plain.status, plain.stderr.join('')).toBe(0)
  expect(record(JSON.parse(plain.stdout[0]))).toMatchObject({
    session: { choice: { fast: false } },
  })
  const fast = await fixture.cli(['create', '--fast', 'true'])
  expect(fast.status, fast.stderr.join('')).toBe(0)
  const created = record(JSON.parse(fast.stdout[0]))
  expect(created).toMatchObject({ session: { choice: { fast: true } } })
  const sessionId = text(record(created.session).id)
  const sent = await fixture.cli([
    'send',
    '--session',
    sessionId,
    '--message',
    'Keep fast',
  ])
  expect(sent.status, sent.stderr.join('')).toBe(0)
  expect(record(JSON.parse(sent.stdout[0]))).toMatchObject({
    session: { workspaceId: OUTER_WORKSPACE, choice: { fast: true } },
    message: { choice: { fast: true } },
  })
  const off = await fixture.cli([
    'send',
    '--session',
    sessionId,
    '--message',
    'Standard',
    '--fast',
    'false',
  ])
  expect(off.status, off.stderr.join('')).toBe(0)
  expect(record(JSON.parse(off.stdout[0]))).toMatchObject({
    session: { choice: { fast: false } },
    message: { choice: { fast: false } },
  })
})
