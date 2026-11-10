import { seedAppAccess } from '../test-support/app-access'
import { sign } from '../security/crypto'
import { SESSION_COOKIE } from '../security/cookies'
import { TEST_TIME } from '../test-support/harness'
import type { ImportFixture } from './service.test-support'

export async function importReader(fixture: ImportFixture) {
  await fixture.db.batch([
    fixture.db
      .prepare(
        `INSERT INTO users (id,github_id,github_login,created_at,updated_at)
      VALUES ('document-reader',18,'reader',?,?)`,
      )
      .bind(TEST_TIME, TEST_TIME),
    fixture.db
      .prepare(
        `INSERT INTO sessions (id,user_id,expires_at)
      VALUES ('document-reader-session','document-reader',?)`,
      )
      .bind(TEST_TIME + 604_800_000),
    fixture.db
      .prepare(
        `INSERT INTO org_members (org_id,user_id,role,joined_at)
      VALUES (?,'document-reader','member',?)`,
      )
      .bind(fixture.org.id, TEST_TIME),
  ])
  await seedAppAccess(fixture.db, ['document-reader'], TEST_TIME)
  const signed = await sign(
    {
      sessionId: 'document-reader-session',
      expiresAt: TEST_TIME + 604_800_000,
    },
    'session',
    fixture.env.SESSION_SIGNING_KEY,
  )
  return `${SESSION_COOKIE}=${signed}`
}
