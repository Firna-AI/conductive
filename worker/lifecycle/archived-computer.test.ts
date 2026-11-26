import { expect, it } from 'vitest'

import {
  readOrderedWorkspaceResponse,
  readWorkspaces,
} from '../../src/app/api/read-workspaces'
import type { ArchivedComputerState } from '../../src/shared/generated/ArchivedComputerState'
import { workspacePath, workspacesPath } from '../../src/shared/workspaces'
import { createApp } from '../application'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { seededCompletedWorkspace } from './backend-workspace.test-support'

const fixtureForTest = setupBackendTests()
const restoreUntil = TEST_TIME + 1_209_600_000

it('projects independent computer evidence through real workspace lists and details', async () => {
  const fixture = fixtureForTest()
  const saved = await seededCompletedWorkspace(fixture)
  const { runtime, org, session } = fixture
  const db = runtime.env.DB
  const app = createApp(runtime.dependencies)
  const read = async (path: string) => {
    const response = await app.fetch(
      new Request(new URL(path, runtime.env.APP_ORIGIN), {
        headers: { Cookie: session, Origin: runtime.env.APP_ORIGIN },
      }),
      runtime.env,
    )
    expect(response.status).toBe(200)
    return response.json()
  }
  const expectEvidence = async (
    state: ArchivedComputerState | undefined,
    availableUntil: number | null = null,
  ) => {
    const list = readWorkspaces(await read(workspacesPath(org.id)))
    const detail = readOrderedWorkspaceResponse(
      await read(workspacePath(org.id, saved.id)),
    )
    expect(list.map(({ id }) => id)).toEqual([saved.id])
    for (const workspace of [list[0], detail.workspace]) {
      expect(workspace).toMatchObject({ restoreUntil: availableUntil })
      expect(workspace?.archivedComputer).toEqual(
        state === undefined ? undefined : { state, restoreUntil },
      )
    }
  }

  await db
    .prepare(
      "UPDATE workspaces SET state = 'archived', archived_at = ? WHERE id = ?",
    )
    .bind(TEST_TIME, saved.id)
    .run()
  await expectEvidence('may-exist', restoreUntil)
  await db
    .prepare('UPDATE workspaces SET sandbox_id = NULL WHERE id = ?')
    .bind(saved.id)
    .run()
  await expectEvidence('may-exist')
  await db
    .prepare('UPDATE computer_ledger SET deleted_at = ? WHERE purpose_id = ?')
    .bind(TEST_TIME, saved.id)
    .run()
  await db
    .prepare(
      `INSERT INTO computer_ledger
       (allocation_key, provider_account, org_id, purpose, purpose_id)
       VALUES ('older-live', 'former-account', ?, 'workspace', ?)`,
    )
    .bind(org.id, saved.id)
    .run()
  await db
    .prepare(
      `INSERT INTO computer_ledger
       (sandbox_id, provider_account, org_id, purpose, purpose_id, deleted_at)
       VALUES ('newer-deleted', 'boat', ?, 'workspace', ?, ?)`,
    )
    .bind(org.id, saved.id, TEST_TIME + 1)
    .run()
  await expectEvidence('may-exist')
  await db
    .prepare(
      "UPDATE computer_ledger SET create_rejected = 1 WHERE allocation_key = 'older-live'",
    )
    .run()
  await expectEvidence('deleted')
  await db
    .prepare('DELETE FROM computer_ledger WHERE org_id = ? AND purpose_id = ?')
    .bind(org.id, saved.id)
    .run()
  await db
    .prepare(
      `INSERT INTO orgs (id, name, creator_user_id, created_at)
       VALUES ('foreign-computer-org', 'Foreign org', ?, ?)`,
    )
    .bind(fixture.user.id, TEST_TIME)
    .run()
  await db.batch(
    [
      [org.id, 'build', saved.id],
      [org.id, 'workspace', 'another-workspace'],
      ['foreign-computer-org', 'workspace', saved.id],
    ].flatMap(([orgId, purpose, purposeId], index) =>
      [null, TEST_TIME].map((deletedAt) =>
        db
          .prepare(
            `INSERT INTO computer_ledger
             (sandbox_id, provider_account, org_id, purpose, purpose_id, deleted_at)
             VALUES (?, 'boat', ?, ?, ?, ?)`,
          )
          .bind(
            `unrelated-${index}-${deletedAt}`,
            orgId,
            purpose,
            purposeId,
            deletedAt,
          ),
      ),
    ),
  )
  await expectEvidence('unknown')
  await db
    .prepare(
      `INSERT INTO computer_ledger
       (allocation_key, provider_account, org_id, purpose, purpose_id, create_rejected)
       VALUES ('refused-only', 'boat', ?, 'workspace', ?, 1)`,
    )
    .bind(org.id, saved.id)
    .run()
  await expectEvidence('unknown')
  await db
    .prepare(
      "UPDATE workspaces SET state = 'stopped', archived_at = NULL WHERE id = ?",
    )
    .bind(saved.id)
    .run()
  await expectEvidence(undefined)
})
