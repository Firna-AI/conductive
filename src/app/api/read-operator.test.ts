import { expect, it } from 'vitest'

import type {
  OperatorAccessSource,
  OperatorUserAccess,
} from '../../shared/operator-waitlist'
import { operatorFixtures, userRow } from '../../test-support/fixtures/operator'
import { ParseError } from './parse'
import { readOperatorUser } from './read-operator-pages'
import { readOperatorOverview, readUsersPage } from './read-operator'

const identity = { githubId: 42, login: 'mira-s' }

const access: OperatorUserAccess = {
  appAccess: { state: 'waiting', waitingSince: 1_800_000_000_000 },
  approvalEmail: { state: 'none', updatedAt: null },
  hasVerifiedEmail: true,
  githubCreatedAt: 1_400_000_000_000,
  referralCode: null,
}

function userWithAccess(fields: OperatorUserAccess) {
  return { ...operatorFixtures().users[0], ...fields }
}

function parsedUser(fields: OperatorUserAccess) {
  const user = userWithAccess(fields)
  return [
    readOperatorUser(user),
    readUsersPage({ users: [userRow(user)], total: 1, nextCursor: null })
      .rows[0],
  ]
}

it('keeps waiting and all access sources and approval email states in user details and rows', () => {
  for (const user of parsedUser(access)) expect(user).toMatchObject(access)
  const sources: readonly OperatorAccessSource[] = [
    { kind: 'approval', operator: identity },
    { kind: 'invite_code', code: 'K7QHM-3XP2R', label: 'Launch team' },
    { kind: 'referral_code', code: 'K7QHM-3XP2R', owner: identity },
    {
      kind: 'org_invitation',
      org: { id: 'org-1', name: 'Team' },
      invitedBy: identity,
    },
    { kind: 'operator' },
    { kind: 'existing' },
    { kind: 'approval', operator: null },
    { kind: 'referral_code', code: 'K7QHM-3XP2R', owner: null },
    {
      kind: 'org_invitation',
      org: { id: 'deleted-org', name: null },
      invitedBy: null,
    },
  ]
  for (const source of sources) {
    const fields: OperatorUserAccess = {
      ...access,
      appAccess: { state: 'granted', grantedAt: 1_800_000_000_001, source },
    }
    for (const user of parsedUser(fields))
      expect(user.appAccess).toEqual(fields.appAccess)
  }
  for (const state of ['none', 'pending', 'sent', 'failed'] as const) {
    const fields: OperatorUserAccess = {
      ...access,
      approvalEmail: { state, updatedAt: 1_800_000_000_002 },
    }
    for (const user of parsedUser(fields))
      expect(user.approvalEmail).toEqual({
        state,
        updatedAt: 1_800_000_000_002,
      })
  }
})

it('keeps the referral totals, disable record, and recipient identities and names in user details and rows', () => {
  const fields: OperatorUserAccess = {
    ...access,
    hasVerifiedEmail: false,
    githubCreatedAt: null,
    referralCode: {
      code: 'K7QHM-3XP2R',
      kind: 'referral',
      label: null,
      owner: identity,
      createdBy: null,
      createdAt: 1_800_000_000_000,
      useLimit: 5,
      uses: 2,
      state: 'disabled',
      disabledAt: 1_800_000_000_002,
      disabledBy: { githubId: 7, login: 'operator' },
      recipients: [
        {
          githubId: 43,
          login: 'dana-k',
          name: 'Dana Kim',
          usedAt: 1_800_000_000_001,
        },
        { githubId: 44, login: 'pkwan', name: null, usedAt: 1_800_000_000_003 },
      ],
    },
  }
  for (const user of parsedUser(fields)) expect(user).toMatchObject(fields)
})

it('rejects malformed access records, email states, verified flags, dates, and referral recipients', () => {
  const user = userWithAccess(access)
  /** A referral code that is valid except for its one recipient. */
  const usedBy = (recipient: Readonly<Record<string, unknown>>) => ({
    referralCode: {
      code: 'K7QHM-3XP2R',
      kind: 'referral',
      label: null,
      owner: null,
      createdBy: null,
      createdAt: 1,
      useLimit: 5,
      uses: 1,
      state: 'active',
      disabledAt: null,
      disabledBy: null,
      recipients: [recipient],
    },
  })
  const cases: readonly {
    name: string
    fields: Readonly<Record<string, unknown>>
  }[] = [
    { name: 'access state', fields: { appAccess: { state: 'unknown' } } },
    {
      name: 'access source',
      fields: {
        appAccess: {
          state: 'granted',
          grantedAt: 1,
          source: { kind: 'unknown' },
        },
      },
    },
    {
      name: 'source identity',
      fields: {
        appAccess: {
          state: 'granted',
          grantedAt: 1,
          source: {
            kind: 'approval',
            operator: { githubId: '42', login: 'mira-s' },
          },
        },
      },
    },
    {
      name: 'email state',
      fields: { approvalEmail: { state: 'unknown', updatedAt: null } },
    },
    { name: 'verified flag', fields: { hasVerifiedEmail: 'yes' } },
    { name: 'GitHub date', fields: { githubCreatedAt: 'yesterday' } },
    {
      name: 'referral recipients',
      fields: usedBy({ githubId: 43, login: 43, name: null, usedAt: 2 }),
    },
    {
      name: 'referral recipient name',
      fields: usedBy({ githubId: 43, login: 'dana-k', name: 43, usedAt: 2 }),
    },
  ]
  for (const { name, fields } of cases) {
    const invalid = { ...user, ...fields }
    expect(() => readOperatorUser(invalid), name).toThrow(ParseError)
    expect(
      () =>
        readUsersPage({
          users: [{ ...invalid, orgs: 0, workspaces: 0, status: 'active' }],
          total: 1,
          nextCursor: null,
        }),
      name,
    ).toThrow(ParseError)
  }
})

it('reads the overview waiting count and rejects a missing or nonnumeric count', () => {
  const overview = { ...operatorFixtures().overview, waiting: 3 }
  expect(readOperatorOverview(overview).waiting).toBe(3)
  for (const waiting of [undefined, '3'])
    expect(() => readOperatorOverview({ ...overview, waiting })).toThrow(
      new ParseError('waiting is not a number.'),
    )
})
