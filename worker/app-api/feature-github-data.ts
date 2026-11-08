export interface ShellGitHubInstallation {
  id: number
  account: string
  accountType: string
  settingsUrl: string
  suspendedAt: number | null
}

export async function saveShellInstallations(
  db: D1Database,
  installations: readonly ShellGitHubInstallation[],
  now: number,
): Promise<void> {
  if (!installations.length) return
  await db.batch(
    installations.map((installation) =>
      db
        .prepare(
          `INSERT INTO github_installations (id, account_login, account_type, created_at, suspended_at)
         VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
         account_login = excluded.account_login, account_type = excluded.account_type,
         suspended_at = excluded.suspended_at`,
        )
        .bind(
          installation.id,
          installation.account,
          installation.accountType,
          now,
          installation.suspendedAt,
        ),
    ),
  )
}
