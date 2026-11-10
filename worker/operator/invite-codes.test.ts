import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type {
  CreateOperatorCodeRequest,
  OperatorAccessCode,
  OperatorCodesResponse,
} from '../../src/shared/operator-waitlist'
import {
  operatorCodeDisablePath,
  operatorCodesPath,
} from '../../src/shared/operator-waitlist'
import { WAITLIST_PATHS } from '../../src/shared/waitlist'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { readWaitlistState } from '../waitlist/data'
import { accessRecord } from '../waitlist/waitlist.test-support'
import { operatorWaitlistFixture, operatorWrite } from './waitlist.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('makes a random labelled code, validates its input, and searches referral codes by owner and displayed text', async () => {
  const client = await operatorWaitlistFixture(harness)
  const body: CreateOperatorCodeRequest = {
    label: '  Launch team  ',
    useLimit: 2,
  }
  const created = await client.request(
    operatorCodesPath(),
    undefined,
    operatorWrite(body),
  )
  expect(created.status).toBe(201)
  const code: OperatorAccessCode = await created.json()
  expect(code).toEqual({
    code: expect.stringMatching(
      /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{5}-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{5}$/,
    ),
    kind: 'invite',
    label: 'Launch team',
    owner: null,
    createdBy: { githubId: 10, login: 'admin' },
    createdAt: TEST_TIME,
    useLimit: 2,
    uses: 0,
    state: 'active',
    disabledAt: null,
    disabledBy: null,
  })
  for (const input of [
    { label: '', useLimit: 1 },
    { label: ' '.repeat(3), useLimit: 1 },
    { label: 'x'.repeat(81), useLimit: 1 },
    { label: 'Fine', useLimit: 0 },
    { label: 'Fine', useLimit: 1.5 },
    { label: 'Fine', useLimit: '2' },
    { label: 'Fine', useLimit: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    const response = await client.request(
      operatorCodesPath(),
      undefined,
      operatorWrite(input),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'invalid_invite_code' },
    })
  }
  const maxLabel = await client.request(
    operatorCodesPath(),
    undefined,
    operatorWrite({ label: 'x'.repeat(80), useLimit: 1 }),
  )
  expect(maxLabel.status).toBe(201)
  const state = await readWaitlistState(harness.env.DB, client.admin.user.id)
  const referral = state.referralCode?.code ?? ''
  for (const q of [
    'AdMiN',
    referral.toLowerCase(),
    referral.replace('-', '').toLowerCase(),
  ]) {
    const response = await client.request(operatorCodesPath({ q }))
    expect(response.status).toBe(200)
    const result: OperatorCodesResponse = await response.json()
    expect(result.total).toBe(1)
    expect(result.codes).toEqual([
      expect.objectContaining({
        code: referral,
        kind: 'referral',
        owner: { githubId: 10, login: 'admin' },
      }),
    ])
  }
  for (const q of [
    'LAUNCH',
    code.code.toLowerCase(),
    code.code.replace('-', '').toLowerCase(),
  ]) {
    const response = await client.request(operatorCodesPath({ q }))
    expect(response.status).toBe(200)
    const result: OperatorCodesResponse = await response.json()
    expect(result.codes).toEqual([code])
  }
  const missing = await client.request(operatorCodesPath({ q: "' OR 1=1 --" }))
  expect(missing.status).toBe(200)
  expect(await missing.json()).toEqual({
    codes: [],
    total: 0,
    nextCursor: null,
  })
})

it('disables invite and referral codes once, keeps earlier grants, and reports used-up codes', async () => {
  const client = await operatorWaitlistFixture(harness)
  const created = await client.request(
    operatorCodesPath(),
    undefined,
    operatorWrite({ label: 'One seat', useLimit: 1 }),
  )
  expect(created.status).toBe(201)
  const invite: OperatorAccessCode = await created.json()
  const used = await client.request(
    WAITLIST_PATHS.useCode,
    client.member.session,
    operatorWrite({ code: invite.code }),
  )
  expect(used.status).toBe(200)
  const list = await client.request(operatorCodesPath())
  expect(list.status).toBe(200)
  expect(await list.json()).toMatchObject({
    codes: [{ code: invite.code, state: 'used_up', uses: 1 }],
  })
  const referral =
    (await readWaitlistState(harness.env.DB, client.admin.user.id)).referralCode
      ?.code ?? ''
  for (const code of [invite.code, referral]) {
    const response = await client.request(
      operatorCodeDisablePath(code.toLowerCase()),
      undefined,
      operatorWrite(),
    )
    expect(response.status).toBe(200)
    const disabled: OperatorAccessCode = await response.json()
    expect(disabled).toMatchObject({
      code,
      state: 'disabled',
      disabledAt: TEST_TIME,
      disabledBy: { githubId: 10, login: 'admin' },
    })
    client.setTime(TEST_TIME + 1)
    const repeated = await client.request(
      operatorCodeDisablePath(code),
      undefined,
      operatorWrite(),
    )
    expect(repeated.status).toBe(200)
    expect(await repeated.json()).toEqual(disabled)
    client.setTime(TEST_TIME)
    const refused = await client.request(
      WAITLIST_PATHS.useCode,
      client.other.session,
      operatorWrite({ code }),
    )
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({
      error: { code: 'invite_code_disabled' },
    })
  }
  expect(await accessRecord(harness, client.member.user.id)).toMatchObject({
    source: 'invite_code',
  })
  const unknown = await client.request(
    operatorCodeDisablePath('UNKNOWN'),
    undefined,
    operatorWrite(),
  )
  expect(unknown.status).toBe(404)
  expect(await unknown.json()).toMatchObject({
    error: { code: 'invite_code_not_found' },
  })
})

it('pages invite codes newest first with a stable code tie and a matching search total', async () => {
  const client = await operatorWaitlistFixture(harness)
  const codes = Array.from(
    { length: 22 },
    (_, index) => `K7QHM3XP${String(index).padStart(2, '0')}`,
  )
  await harness.env.DB.batch(
    codes.map((code, index) =>
      harness.env.DB.prepare(
        `INSERT INTO access_codes (code, kind, label, use_limit, created_at) VALUES (?, 'invite', 'Page code', 2, ?)`,
      ).bind(code, TEST_TIME + (index === 21 ? 1 : 0)),
    ),
  )
  const response = await client.request(operatorCodesPath())
  expect(response.status).toBe(200)
  const first: OperatorCodesResponse = await response.json()
  expect(first.total).toBe(22)
  expect(first.codes.map((c) => c.code)).toEqual([
    'K7QHM-3XP21',
    'K7QHM-3XP00',
    'K7QHM-3XP01',
    'K7QHM-3XP02',
    'K7QHM-3XP03',
    'K7QHM-3XP04',
    'K7QHM-3XP05',
    'K7QHM-3XP06',
    'K7QHM-3XP07',
    'K7QHM-3XP08',
    'K7QHM-3XP09',
    'K7QHM-3XP10',
    'K7QHM-3XP11',
    'K7QHM-3XP12',
    'K7QHM-3XP13',
    'K7QHM-3XP14',
    'K7QHM-3XP15',
    'K7QHM-3XP16',
    'K7QHM-3XP17',
    'K7QHM-3XP18',
  ])
  expect(typeof first.nextCursor).toBe('string')
  const next = await client.request(
    operatorCodesPath({ q: 'PAGE', cursor: first.nextCursor ?? '' }),
  )
  expect(next.status).toBe(200)
  const last: OperatorCodesResponse = await next.json()
  expect(last.total).toBe(22)
  expect(last.codes.map((c) => c.code)).toEqual(['K7QHM-3XP19', 'K7QHM-3XP20'])
  expect(last.nextCursor).toBeNull()
})
