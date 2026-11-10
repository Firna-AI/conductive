import { expect, it } from 'vitest'

import { createHarness } from '../test-support/harness'
import { applyMigrations } from '../test-support/migrations'

const migration = '202611100000_codex_access_token.sql'

it('keeps existing logins and accepts Codex tokens after the table rebuild', async () => {
  const harness = await createHarness({ migrationsBefore: migration })
  const db = harness.env.DB
  try {
    await db.batch([
      db.prepare(
        `INSERT INTO users (id, github_id, github_login, created_at, updated_at)
         VALUES ('owner', 1, 'owner', 1, 2), ('other', 2, 'other', 3, 4)`,
      ),
      db.prepare(
        `INSERT INTO agent_logins
         (user_id, agent, kind, ciphertext, created_at, updated_at, no_reuse)
         VALUES ('owner', 'claude', 'token', 'encrypted-claude', 11, 12, 0),
                ('owner', 'codex', 'api-key', 'encrypted-codex', 21, 22, 1)`,
      ),
    ])
    const codexToken = () =>
      db
        .prepare(
          `INSERT INTO agent_logins
           (user_id, agent, kind, ciphertext, created_at, updated_at, no_reuse)
           VALUES ('other', 'codex', 'token', 'encrypted-token', 31, 32, 1)`,
        )
        .run()
    await expect(codexToken()).rejects.toThrow('CHECK constraint failed')

    await applyMigrations(db, { from: migration })

    expect(
      (
        await db
          .prepare('SELECT * FROM agent_logins ORDER BY user_id, agent')
          .all()
      ).results,
    ).toEqual([
      {
        user_id: 'owner',
        agent: 'claude',
        kind: 'token',
        ciphertext: 'encrypted-claude',
        created_at: 11,
        updated_at: 12,
        no_reuse: 0,
        refresh_claim: null,
        refresh_claim_until: null,
        failure_cause: null,
      },
      {
        user_id: 'owner',
        agent: 'codex',
        kind: 'api-key',
        ciphertext: 'encrypted-codex',
        created_at: 21,
        updated_at: 22,
        no_reuse: 1,
        refresh_claim: null,
        refresh_claim_until: null,
        failure_cause: null,
      },
    ])
    await expect(codexToken()).resolves.toMatchObject({ success: true })
    await db.prepare("DELETE FROM users WHERE id = 'other'").run()
    expect(
      await db
        .prepare(
          "SELECT COUNT(*) AS count FROM agent_logins WHERE user_id = 'other'",
        )
        .first<number>('count'),
    ).toBe(0)
  } finally {
    await harness.dispose()
  }
})
