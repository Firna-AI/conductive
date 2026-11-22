import { expect } from 'vitest'

import type { OrgRole } from '../../src/shared/api'
import {
  operatorOrgPath,
  operatorOrgsPath,
  operatorUserPath,
  operatorUsersPath,
  type OperatorDirectoryQuery,
  type OperatorOrgDetail,
  type OperatorOrgsResponse,
  type OperatorUserDetail,
  type OperatorUsersResponse,
} from '../../src/shared/operator'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { seedMember } from '../test-support/d1-seeds'
import { seedUser } from './overview.test-support'

export async function orgList(
  harness: TestHarness,
  cookie: string,
  query: OperatorDirectoryQuery = {},
): Promise<OperatorOrgsResponse> {
  const response = await harness.request(operatorOrgsPath(query), cookie)
  expect(response.status).toBe(200)
  return response.json()
}

export async function userList(
  harness: TestHarness,
  cookie: string,
  query: OperatorDirectoryQuery = {},
): Promise<OperatorUsersResponse> {
  const response = await harness.request(operatorUsersPath(query), cookie)
  expect(response.status).toBe(200)
  return response.json()
}

export async function orgPage(
  harness: TestHarness,
  cookie: string,
  orgId: string,
): Promise<OperatorOrgDetail> {
  const response = await harness.request(operatorOrgPath(orgId), cookie)
  expect(response.status).toBe(200)
  return response.json()
}

export async function userPage(
  harness: TestHarness,
  cookie: string,
  githubId: number,
): Promise<OperatorUserDetail> {
  const response = await harness.request(operatorUserPath(githubId), cookie)
  expect(response.status).toBe(200)
  return response.json()
}

export async function directoryUser(
  harness: TestHarness,
  user: {
    githubId: number
    login: string
    name?: string
    createdAt?: number
  },
): Promise<void> {
  await seedUser(harness, user.githubId, user.createdAt ?? TEST_TIME)
  await harness.env.DB.prepare(
    'UPDATE users SET github_login = ?, display_name = ? WHERE github_id = ?',
  )
    .bind(user.login, user.name ?? null, user.githubId)
    .run()
}

export async function addMember(
  harness: TestHarness,
  orgId: string,
  githubId: number,
  role: OrgRole = 'member',
): Promise<void> {
  await seedMember(harness.env.DB, {
    orgId,
    userId: { githubId },
    role,
    joinedAt: TEST_TIME,
  }).run()
}
