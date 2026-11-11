import {
  newUsersByDay,
  newWorkspacesByDay,
  operatorTotals,
  runningComputers,
  workspaceStates,
} from '../../../docs/mockups/src/fixtures/operator'
import type {
  OperatorOrgDetail,
  OperatorOrgMatch,
  OperatorOrgSummary,
  OperatorOverview,
  OperatorSuspension,
  OperatorUserDetail,
  OperatorUserSummary,
} from '../../shared/operator'
import { FAKE_TIME, fakeUser } from './core'
import {
  sampleCodes,
  sampleUserAccess,
  sampleWaitlist,
  type AccessRecords,
} from './operator-access'
import { sampleAccessRecords } from './operator-access-records'
import {
  daysBefore,
  SAMPLE_IDS,
  sampleOrgs,
  sampleUsers,
  type SampleOrg,
  type SampleUser,
} from './operator-samples'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * The suspensions and the deletions of the samples, and the records of the
 * waitlist: the approvals, the open sign-ups, the codes, the pause, and the
 * switch. They can change.
 */
export interface OperatorRecords extends AccessRecords {
  orgSuspensions: Map<string, OperatorSuspension>
  orgDeletions: Map<string, { deletedAt: number; purgeAt: number | null }>
  userSuspensions: Map<number, OperatorSuspension>
}

/** The operator of the sample suspensions: the person signed in. */
export const sampleOperator = {
  githubId: fakeUser.githubId,
  login: fakeUser.githubLogin,
} as const

/**
 * The records of the mockups at `now`: Hexwave suspended 25 minutes ago,
 * Dana Kim suspended 2 days ago with her referral code, and Pinecrest
 * deleted 3 days ago. The waitlist records are those of
 * `sampleAccessRecords`.
 */
export function sampleRecords(now = FAKE_TIME): OperatorRecords {
  const suspended = (ago: number) => ({
    suspendedAt: now - ago,
    operator: sampleOperator,
  })
  const userSuspensions = new Map([
    [SAMPLE_IDS.suspendedUser, suspended(2 * DAY - 72 * MINUTE)],
  ])
  return {
    ...sampleAccessRecords(now, sampleOperator, userSuspensions),
    orgSuspensions: new Map([
      [SAMPLE_IDS.suspendedOrg, suspended(25 * MINUTE)],
    ]),
    orgDeletions: new Map([
      [
        SAMPLE_IDS.deletedOrg,
        { deletedAt: now - 3 * DAY, purgeAt: now + 4 * DAY },
      ],
    ]),
    userSuspensions,
  }
}

function sampleUser(login: string): SampleUser {
  const user = sampleUsers.find((item) => item.login === login)
  if (!user) throw new Error(`The operator samples have no user ${login}.`)
  return user
}

/** The page of a sample org, with its records. */
export function sampleOrgDetail(
  org: SampleOrg,
  records: OperatorRecords,
  now = FAKE_TIME,
): OperatorOrgDetail {
  return {
    id: org.id,
    name: org.name,
    initials: org.initials,
    createdAt: daysBefore(now, org.createdDaysAgo),
    repositories: org.repositories,
    workspaceStates: org.states,
    running: { workspaces: org.states.running, builds: org.builds },
    members: Object.entries(org.members).map(([login, role]) => {
      const { githubId, name } = sampleUser(login)
      const suspended = records.userSuspensions.has(githubId)
      return { githubId, login, name, role, suspended }
    }),
    suspension: records.orgSuspensions.get(org.id) ?? null,
    deletion: records.orgDeletions.get(org.id) ?? null,
  }
}

/** The page of a sample user, with their orgs and their record. */
export function sampleUserDetail(
  user: SampleUser,
  records: OperatorRecords,
  now = FAKE_TIME,
): OperatorUserDetail {
  const joinedAt = daysBefore(now, user.joinedDaysAgo)
  return {
    githubId: user.githubId,
    login: user.login,
    name: user.name,
    joinedAt,
    ...sampleUserAccess(user, records, now),
    workspaces: { total: user.owned, running: user.running },
    orgs: sampleOrgs.flatMap((org) => {
      const role = org.members[user.login]
      if (role === undefined) return []
      return [{ id: org.id, name: org.name, initials: org.initials, role }]
    }),
    suspension: records.userSuspensions.get(user.githubId) ?? null,
  }
}

function totalOf(org: OperatorOrgDetail): number {
  const { running, stopped, failed, archived } = org.workspaceStates
  return running + stopped + failed + archived
}

/** The row of an org in the Orgs tab, from its page. */
export function orgRow(
  org: OperatorOrgDetail,
  match: OperatorOrgMatch | null = null,
): OperatorOrgSummary {
  const status = org.deletion
    ? 'deleted'
    : org.suspension
      ? 'suspended'
      : 'active'
  return {
    id: org.id,
    name: org.name,
    initials: org.initials,
    createdAt: org.createdAt,
    members: org.members.length,
    workspaces: totalOf(org),
    running: org.workspaceStates.running,
    status,
    match,
  }
}

/** The row of a user in the Users tab, from their page. */
export function userRow(user: OperatorUserDetail): OperatorUserSummary {
  return {
    appAccess: user.appAccess,
    approvalEmail: user.approvalEmail,
    hasVerifiedEmail: user.hasVerifiedEmail,
    githubCreatedAt: user.githubCreatedAt,
    referralCode: user.referralCode,
    githubId: user.githubId,
    login: user.login,
    name: user.name,
    joinedAt: user.joinedAt,
    orgs: user.orgs.length,
    workspaces: user.workspaces.total,
    status: user.suspension ? 'suspended' : 'active',
  }
}

/**
 * The numbers of the Overview of the mockups, for the 30 UTC days up to
 * the day of `readAt`. The largest orgs are those of the samples, so that
 * each opens its page, and `waiting` counts the people who wait.
 */
export function operatorOverview(
  orgs: readonly OperatorOrgDetail[],
  readAt = FAKE_TIME,
  waiting = 0,
): OperatorOverview {
  const today = Math.floor(readAt / DAY)
  const dated = (days: readonly { count: number }[]) =>
    days.map((day, index) => ({
      date: new Date((today - (days.length - 1 - index)) * DAY)
        .toISOString()
        .slice(0, 10),
      count: day.count,
    }))
  const largest = orgs
    .filter((org) => !org.deletion)
    .sort((a, b) => totalOf(b) - totalOf(a) || a.name.localeCompare(b.name))
    .slice(0, 5)
  return {
    readAt,
    users: operatorTotals.users,
    waiting,
    orgs: operatorTotals.orgs,
    workspaces: operatorTotals.workspaces,
    running: { ...runningComputers },
    workspaceStates: { ...workspaceStates },
    newWorkspacesByDay: dated(newWorkspacesByDay),
    newUsersByDay: dated(newUsersByDay),
    largestOrgs: largest.map((org) => ({
      id: org.id,
      name: org.name,
      initials: org.initials,
      members: org.members.length,
      workspaces: totalOf(org),
      running: org.workspaceStates.running,
    })),
  }
}

/** Every reply of the operator samples at `now`, with their records. */
export function operatorFixtures(now = FAKE_TIME) {
  const records = sampleRecords(now)
  const orgs = sampleOrgs.map((org) => sampleOrgDetail(org, records, now))
  const users = sampleUsers.map((user) => sampleUserDetail(user, records, now))
  const waitlist = sampleWaitlist(records, records.userSuspensions, now)
  return {
    overview: operatorOverview(orgs, now, waitlist.length),
    orgs,
    users,
    waitlist,
    codes: sampleCodes(records),
    pause: records.pause,
    waitlistSwitch: { ...records.waitlistSwitch, waiting: waitlist.length },
  }
}
