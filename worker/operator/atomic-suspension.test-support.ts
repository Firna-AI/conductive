import type { OperatorSuspension } from '../../src/shared/operator'
import {
  orgSuspensionPath,
  userSuspensionPath,
} from '../../src/shared/operator'
import { signIn } from '../members/members-test-support'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { orgPage, userPage } from './directory.test-support'
import { userResources } from './lift.test-support'

type TargetKind = 'user' | 'org'

export async function atomicSuspensionFixture(
  harness: TestHarness,
  kind: TargetKind,
) {
  const operator = await signIn(harness, 7, 'operator')
  const target = await signIn(harness, 8, 'target')
  const token = await userResources(harness, target.user)
  const table = kind === 'user' ? 'users' : 'orgs'
  const id = kind === 'user' ? target.user.id : 'resources'
  return {
    operator,
    target,
    token,
    path:
      kind === 'user' ? userSuspensionPath(8) : orgSuspensionPath('resources'),
    readSuspension: (): Promise<OperatorSuspension | null> =>
      (kind === 'user'
        ? userPage(harness, operator.session, 8)
        : orgPage(harness, operator.session, 'resources')
      ).then((page) => page.suspension),
    async seedEarlierPartialSuspension() {
      await harness.env.DB.batch([
        harness.env.DB.prepare(
          `UPDATE ${table} SET suspended_at = ?, suspended_by_user_id = ? WHERE id = ?`,
        ).bind(TEST_TIME - 1_000, operator.user.id, id),
        harness.env.DB.prepare(
          `INSERT INTO suspension_events (target_kind, target_id, action, occurred_at, operator_user_id)
           VALUES (?, ?, 'suspend', ?, ?)`,
        ).bind(kind, id, TEST_TIME - 1_000, operator.user.id),
      ])
    },
  }
}

export async function failPreviewRevocation(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TRIGGER fail_preview_revocation BEFORE UPDATE OF revoked_at ON preview_hostnames
     WHEN OLD.id = 'preview' AND NEW.revoked_at IS NOT NULL
     BEGIN SELECT RAISE(ABORT, 'Injected revocation failure'); END`,
    )
    .run()
}

export async function dropRevocationFailure(db: D1Database): Promise<void> {
  await db.prepare('DROP TRIGGER IF EXISTS fail_preview_revocation').run()
}

export async function readRevocations(db: D1Database) {
  const [token, preview] = await db.batch<{ revokedAt: number | null }>([
    db
      .prepare(
        'SELECT revoked_at AS revokedAt FROM workspace_tokens WHERE workspace_id = ?',
      )
      .bind('owned-workspace'),
    db
      .prepare(
        'SELECT revoked_at AS revokedAt FROM preview_hostnames WHERE id = ?',
      )
      .bind('preview'),
  ])
  return {
    token: token.results[0]?.revokedAt,
    preview: preview.results[0]?.revokedAt,
  }
}
