/** Replace the private email set only after GitHub returns every page successfully. */
export async function saveVerifiedEmails(
  db: D1Database,
  userId: string,
  emails: readonly string[],
): Promise<void> {
  const values = [...new Set(emails.map((email) => email.toLowerCase()))]
  await db.batch([
    db
      .prepare('DELETE FROM user_verified_emails WHERE user_id = ?')
      .bind(userId),
    ...values.map((email) =>
      db
        .prepare(
          'INSERT INTO user_verified_emails (user_id, email) VALUES (?, ?)',
        )
        .bind(userId, email),
    ),
  ])
}
