import { appAccessGrantStatements } from '../waitlist/grant'

/** App fixtures opt in to the access that their protected requests need. */
export async function seedAppAccess(
  db: D1Database,
  userIds: readonly string[],
  now: number,
): Promise<void> {
  await db.batch(
    userIds.flatMap((userId) =>
      appAccessGrantStatements(db, userId, { source: 'existing' }, now),
    ),
  )
}
