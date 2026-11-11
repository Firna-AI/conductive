import { expect, it } from 'vitest'
import type {
  OperatorApprovalResponse,
  OperatorSignupPause,
  OperatorWaitlistSwitch,
} from '../../shared/operator-waitlist'
import { operatorFixtures } from '../../test-support/fixtures/operator'
import { ParseError } from './parse'
import {
  readApproval,
  readCodesPage,
  readSignupPause,
  readWaitlistPage,
  readWaitlistSwitch,
} from './read-operator-waitlist'

const fixtures = operatorFixtures()

const approval: OperatorApprovalResponse = {
  githubId: 91827364,
  changed: true,
  approvalEmail: { state: 'pending', updatedAt: 1_800_000_000_000 },
  emailFailed: true,
}

const pause: OperatorSignupPause = {
  paused: true,
  updatedAt: 1_800_000_000_000,
  operator: { githubId: 1, login: 'calummoore' },
}

const waitlistOff: OperatorWaitlistSwitch = {
  waitlistOn: false,
  updatedAt: 1_800_000_000_000,
  operator: { githubId: 1, login: 'calummoore' },
  waiting: 38,
}

it('keeps every field of the waitlist, the codes, an approval, the pause, and the waitlist switch', () => {
  const waitlist = { users: fixtures.waitlist, total: 10, nextCursor: 'p2' }
  const codes = { codes: fixtures.codes, total: 20, nextCursor: null }
  expect({
    waitlist: readWaitlistPage(waitlist),
    codes: readCodesPage(codes),
    approval: readApproval(approval),
    pause: readSignupPause(pause),
    open: readSignupPause({ paused: false, updatedAt: null, operator: null }),
    waitlistOff: readWaitlistSwitch(waitlistOff),
    waitlistOn: readWaitlistSwitch({
      waitlistOn: true,
      updatedAt: null,
      operator: null,
      waiting: 0,
    }),
  }).toEqual({
    waitlist: { rows: fixtures.waitlist, total: 10, nextCursor: 'p2' },
    codes: { rows: fixtures.codes, total: 20, nextCursor: null },
    approval,
    pause,
    open: { paused: false, updatedAt: null, operator: null },
    waitlistOff,
    waitlistOn: {
      waitlistOn: true,
      updatedAt: null,
      operator: null,
      waiting: 0,
    },
  })
})

it('rejects a reply of an unknown shape: a code state, an email state, a pause flag, a switch flag, a verified flag, or a count', () => {
  const [person] = fixtures.waitlist
  const [code] = fixtures.codes
  const cases = [
    () => readCodesPage({ codes: [{ ...code, state: 'expired' }], total: 1 }),
    () =>
      readApproval({
        ...approval,
        approvalEmail: { state: 'bounced', updatedAt: null },
      }),
    () => readSignupPause({ ...pause, paused: 'yes' }),
    () => readWaitlistSwitch({ ...waitlistOff, waitlistOn: 'off' }),
    () => readWaitlistSwitch({ ...waitlistOff, waiting: '38' }),
    () =>
      readWaitlistPage({
        users: [{ ...person, hasVerifiedEmail: null }],
        total: 1,
        nextCursor: null,
      }),
    () => readWaitlistPage({ users: [], total: '0', nextCursor: null }),
  ]
  for (const [index, read] of cases.entries()) {
    expect(read, `case ${index}`).toThrow(ParseError)
  }
})
