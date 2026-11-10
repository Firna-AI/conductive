import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { OperatorOrgMatch } from '../../src/shared/operator'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { directoryUser, orgList, userList } from './directory.test-support'
import { seedBuild, seedOrg, seedWorkspace } from './overview.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.OPERATOR_GITHUB_IDS = '7'
})
afterAll(async () => harness.dispose())

it('finds orgs by each exact resource key and literal name text, including closed previews', async () => {
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'target-org', name: 'Kestrel Labs' })
  await seedOrg(harness, { id: 'literal-org', name: 'Literal 100%_\\ lab' })
  await seedOrg(harness, { id: 'other-org', name: 'Literal 100XX lab' })
  await seedWorkspace(harness, {
    id: 'workspace',
    orgId: 'target-org',
    state: 'stopped',
  })
  await harness.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
  )
    .bind('workspace-computer', 'workspace')
    .run()
  await seedBuild(harness, {
    id: 'build',
    orgId: 'target-org',
    kind: 'build',
    state: 'succeeded',
    phase: 'done',
  })
  await harness.env.DB.prepare(
    'UPDATE image_builds SET sandbox_id = ? WHERE id = ?',
  )
    .bind('build-computer', 'build')
    .run()
  for (const [id, revokedAt] of [
    ['open', null],
    ['closed', TEST_TIME],
  ] as const)
    await harness.env.DB.prepare(
      `INSERT INTO preview_hostnames
       (id, hostname, org_id, workspace_id, port, created_at, expires_at, revoked_at)
       VALUES (?, ?, 'target-org', 'workspace', 3000, ?, ?, ?)`,
    )
      .bind(id, `${id}.conductive.test`, TEST_TIME, TEST_TIME, revokedAt)
      .run()
  await seedWorkspace(harness, {
    id: 'archived-workspace',
    orgId: 'target-org',
    state: 'archived',
    archivedAt: TEST_TIME,
  })
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      `INSERT INTO lifecycle_sandbox_cleanup (workspace_id, org_id, sandbox_id)
       VALUES ('removed-workspace', 'target-org', 'cleanup-computer')`,
    ),
    harness.env.DB.prepare(
      `INSERT INTO preview_hostnames
       (id, hostname, org_id, workspace_id, port, created_at, expires_at, revoked_at, listener_sandbox_id)
       VALUES ('old-listener', 'old.conductive.test', 'target-org', 'archived-workspace', 3000, ?, ?, ?, 'listener-computer')`,
    ).bind(TEST_TIME, TEST_TIME, TEST_TIME),
    harness.env.DB.prepare(
      `INSERT INTO terminal_credentials (workspace_id, sandbox_id, ciphertext, updated_at)
       VALUES ('archived-workspace', 'terminal-computer', 'unread-credential', ?)`,
    ).bind(TEST_TIME),
  ])
  const cases: readonly {
    q: string
    id: string | null
    match: OperatorOrgMatch | null
  }[] = [
    { q: 'KeSTreL', id: 'target-org', match: null },
    { q: 'missing-name', id: null, match: null },
    { q: 'target-org', id: 'target-org', match: 'org-id' },
    { q: 'target-or', id: null, match: null },
    { q: 'workspace-computer', id: 'target-org', match: 'cloud-computer-id' },
    { q: 'workspace-compute', id: null, match: null },
    { q: 'build-computer', id: 'target-org', match: 'cloud-computer-id' },
    { q: 'build-compute', id: null, match: null },
    { q: 'cleanup-computer', id: 'target-org', match: 'cloud-computer-id' },
    { q: 'listener-computer', id: 'target-org', match: 'cloud-computer-id' },
    { q: 'terminal-computer', id: 'target-org', match: 'cloud-computer-id' },
    {
      q: 'https://open.conductive.test',
      id: 'target-org',
      match: 'preview-address',
    },
    {
      q: 'https://open.conductive.test/path?q=1#part',
      id: 'target-org',
      match: 'preview-address',
    },
    { q: 'OPEN.conductive.test', id: 'target-org', match: 'preview-address' },
    { q: 'closed.conductive.test', id: 'target-org', match: 'preview-address' },
    { q: 'https://missing.conductive.test/path', id: null, match: null },
    { q: 'missing.conductive.test', id: null, match: null },
    { q: '%_\\', id: 'literal-org', match: null },
    { q: "' OR 1=1 --", id: null, match: null },
  ]
  for (const test of cases) {
    const result = await orgList(harness, cookie, { q: test.q })
    expect(result.total, test.q).toBe(test.id === null ? 0 : 1)
    expect(
      result.orgs.map((org) => ({ id: org.id, match: org.match })),
      test.q,
    ).toEqual(test.id === null ? [] : [{ id: test.id, match: test.match }])
    expect(result.nextCursor, test.q).toBeNull()
  }
  await harness.env.DB.batch([
    harness.env.DB.prepare('DELETE FROM lifecycle_sandbox_cleanup'),
    harness.env.DB.prepare('DELETE FROM workspaces'),
    harness.env.DB.prepare('DELETE FROM image_builds'),
    harness.env.DB.prepare('UPDATE computer_ledger SET deleted_at = ?').bind(
      TEST_TIME,
    ),
  ])
  for (const q of [
    'workspace-computer',
    'build-computer',
    'cleanup-computer',
    'listener-computer',
    'terminal-computer',
  ]) {
    const result = await orgList(harness, cookie, { q })
    expect(
      result.orgs.map((org) => ({ id: org.id, match: org.match })),
      q,
    ).toEqual([{ id: 'target-org', match: 'cloud-computer-id' }])
  }
})

it('finds users by login, name, and exact numeric GitHub ID without treating LIKE symbols as wildcards', async () => {
  const cookie = await harness.login()
  await directoryUser(harness, {
    githubId: 8,
    login: 'dana-k',
    name: 'Dana Kim',
  })
  await directoryUser(harness, { githubId: 9, login: 'vex-ops' })
  await directoryUser(harness, {
    githubId: 10,
    login: 'literal',
    name: 'Literal 100%_\\ name',
  })
  await directoryUser(harness, {
    githubId: 80,
    login: 'another',
    name: 'Another Account',
  })
  const cases: readonly { q: string; ids: readonly number[] }[] = [
    { q: 'VeX', ids: [9] },
    { q: 'ghost-login', ids: [] },
    { q: 'kIM', ids: [8] },
    { q: 'missing-name', ids: [] },
    { q: '8', ids: [8] },
    { q: '888', ids: [] },
    { q: '%_\\', ids: [10] },
    { q: "' OR 1=1 --", ids: [] },
  ]
  for (const test of cases) {
    const result = await userList(harness, cookie, { q: test.q })
    expect(result.total, test.q).toBe(test.ids.length)
    expect(
      result.users.map((user) => user.githubId),
      test.q,
    ).toEqual(test.ids)
    expect(result.nextCursor, test.q).toBeNull()
  }
})
