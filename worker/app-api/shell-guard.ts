import { activeOrgPredicate } from '../data/org-access'

export const shellGuard = '{{shellGuard}}'

const guardedStatementBrand = Symbol('GuardedStatement')

export type GuardedStatement = D1PreparedStatement & {
  readonly [guardedStatementBrand]: true
}

interface ShellAccess {
  orgId: string
  userId: string
}

export function guardedStatement(
  db: D1Database,
  access: ShellAccess,
  sql: string,
  values: readonly unknown[],
): GuardedStatement {
  if (/\?(?!\d)/.test(sql))
    throw new Error('Use numbered placeholders in a guarded shell statement.')
  if (!sql.includes(shellGuard))
    throw new Error(
      'A guarded shell statement must include the shellGuard token.',
    )
  const guard = `EXISTS (
    SELECT 1 FROM orgs access_org
    JOIN org_members access_member ON access_member.org_id = access_org.id
    JOIN users access_user ON access_user.id = access_member.user_id
    WHERE access_org.id = ?${values.length + 1} AND access_member.user_id = ?${values.length + 2}
      AND access_org.deleted_at IS NULL AND access_user.suspended_at IS NULL
      AND ${activeOrgPredicate('access_org')}
  )`
  return Object.assign(
    db
      .prepare(sql.replaceAll(shellGuard, guard))
      .bind(...values, access.orgId, access.userId),
    { [guardedStatementBrand]: true as const },
  )
}

export function guardedBatch<T = unknown>(
  db: D1Database,
  statements: GuardedStatement[],
): Promise<D1Result<T>[]> {
  return db.batch<T>(statements)
}

export function guardedRun<T = Record<string, unknown>>(
  statement: GuardedStatement,
): Promise<D1Result<T>> {
  return statement.run<T>()
}

export function shellRead(
  db: D1Database,
  sql: string,
  values: readonly unknown[] = [],
): D1PreparedStatement {
  if (!/^\s*SELECT\b/i.test(sql) || /;\s*\S/.test(sql))
    throw new Error('shellRead accepts only a single SELECT statement.')
  return db.prepare(sql).bind(...values)
}
