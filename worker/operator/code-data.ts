import type {
  OperatorAccessCode,
  OperatorCodesResponse,
} from '../../src/shared/operator-waitlist'
import { HttpError } from '../http'
import {
  displayAccessCode,
  normalizeAccessCode,
  randomAccessCode,
} from '../waitlist/codes'
import { inviteCodeError } from '../waitlist/errors'
import { directoryCursor, directoryPage, namePattern } from './directory'

export interface OperatorCodeRow {
  code: string
  kind: 'invite' | 'referral'
  label: string | null
  ownerId: string | null
  ownerGithubId: number | null
  ownerLogin: string | null
  makerGithubId: number | null
  makerLogin: string | null
  createdAt: number
  useLimit: number
  uses: number
  disabledAt: number | null
  disablerGithubId: number | null
  disablerLogin: string | null
}

export const operatorCodeSelect = `SELECT c.code, c.kind, c.label, c.owner_user_id AS ownerId,
  owner.github_id AS ownerGithubId, owner.github_login AS ownerLogin,
  maker.github_id AS makerGithubId, maker.github_login AS makerLogin,
  c.created_at AS createdAt, c.use_limit AS useLimit, c.disabled_at AS disabledAt,
  disabler.github_id AS disablerGithubId, disabler.github_login AS disablerLogin,
  (SELECT COUNT(*) FROM access_code_uses uses WHERE uses.code = c.code) AS uses
  FROM access_codes c LEFT JOIN users owner ON owner.id = c.owner_user_id
  LEFT JOIN users maker ON maker.id = c.created_by_user_id
  LEFT JOIN users disabler ON disabler.id = c.disabled_by_user_id`

export function operatorCode(row: OperatorCodeRow): OperatorAccessCode {
  return {
    code: displayAccessCode(row.code),
    kind: row.kind,
    label: row.label,
    owner:
      row.ownerGithubId !== null && row.ownerLogin !== null
        ? { githubId: row.ownerGithubId, login: row.ownerLogin }
        : null,
    createdBy:
      row.makerGithubId !== null && row.makerLogin !== null
        ? { githubId: row.makerGithubId, login: row.makerLogin }
        : null,
    createdAt: row.createdAt,
    useLimit: row.useLimit,
    uses: row.uses,
    state:
      row.disabledAt !== null
        ? 'disabled'
        : row.uses >= row.useLimit
          ? 'used_up'
          : 'active',
    disabledAt: row.disabledAt,
    disabledBy:
      row.disablerGithubId !== null && row.disablerLogin !== null
        ? { githubId: row.disablerGithubId, login: row.disablerLogin }
        : null,
  }
}

export async function readOperatorCodes(
  db: D1Database,
  params: URLSearchParams,
): Promise<OperatorCodesResponse> {
  const query = params.get('q')?.trim() ?? ''
  const cursor = directoryCursor(params.get('cursor'))
  const matches = `WHERE (?1 = '' AND c.kind = 'invite') OR (?1 != '' AND (
    c.code LIKE ?2 ESCAPE '\\' OR (c.kind = 'invite' AND c.label LIKE ?3 ESCAPE '\\')
    OR (c.kind = 'referral' AND owner.github_login LIKE ?3 ESCAPE '\\')))`
  const values = [
    query,
    namePattern(normalizeAccessCode(query)),
    namePattern(query),
  ]
  const [count, page] = await db.batch<{ total: number } | OperatorCodeRow>([
    db
      .prepare(
        `SELECT COUNT(*) AS total FROM access_codes c
      LEFT JOIN users owner ON owner.id = c.owner_user_id ${matches}`,
      )
      .bind(...values),
    db
      .prepare(
        `${operatorCodeSelect} WHERE c.code IN (
      SELECT c.code FROM access_codes c LEFT JOIN users owner ON owner.id = c.owner_user_id ${matches})
      AND (?4 IS NULL OR c.created_at < ?4 OR (c.created_at = ?4 AND c.code > ?5))
      ORDER BY c.created_at DESC, c.code LIMIT 21`,
      )
      .bind(...values, cursor?.createdAt ?? null, cursor?.id ?? null),
  ])
  const total = count.results[0]
  if (!total || !('total' in total))
    throw new Error('Invalid invite code count')
  const rows = page.results.map((row) => {
    if (!('code' in row)) throw new Error('Invalid invite code row')
    return row
  })
  const { entries, nextCursor } = directoryPage(rows, (row) => ({
    createdAt: row.createdAt,
    id: row.code,
  }))
  return { codes: entries.map(operatorCode), total: total.total, nextCursor }
}

async function readOperatorCode(
  db: D1Database,
  code: string,
): Promise<OperatorAccessCode> {
  const row = await db
    .prepare(`${operatorCodeSelect} WHERE c.code = ?`)
    .bind(code)
    .first<OperatorCodeRow>()
  if (!row) throw inviteCodeError('invite_code_not_found')
  return operatorCode(row)
}

export async function createOperatorCode(
  db: D1Database,
  operatorId: string,
  label: string,
  useLimit: number,
  now: number,
) {
  const code = randomAccessCode()
  await db
    .prepare(
      `INSERT INTO access_codes (code, kind, label, use_limit, created_by_user_id, created_at)
    VALUES (?, 'invite', ?, ?, ?, ?)`,
    )
    .bind(code, label, useLimit, operatorId, now)
    .run()
  return readOperatorCode(db, code)
}

export async function disableOperatorCode(
  db: D1Database,
  input: string,
  operatorId: string,
  now: number,
) {
  const code = normalizeAccessCode(input)
  await db
    .prepare(
      `UPDATE access_codes SET disabled_at = ?, disabled_by_user_id = ?
    WHERE code = ? AND disabled_at IS NULL`,
    )
    .bind(now, operatorId, code)
    .run()
  return readOperatorCode(db, code)
}

export function parseOperatorCode(body: Record<string, unknown> | null) {
  const label = typeof body?.label === 'string' ? body.label.trim() : ''
  const useLimit = body?.useLimit
  if (
    !label ||
    label.length > 80 ||
    typeof useLimit !== 'number' ||
    !Number.isSafeInteger(useLimit) ||
    useLimit < 1
  )
    throw new HttpError(
      400,
      'invalid_invite_code',
      'Enter a label of up to 80 characters and a whole use limit of 1 or more.',
    )
  return { label, useLimit }
}
