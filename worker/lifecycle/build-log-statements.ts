import { buildLogRetentionStatements } from './build-log-retention'
import { hideMachineTokens } from './build-machine-token'
import type { RedactedCommandOutput } from './build-output-redaction'

const LOG_ROW_BYTES = 262_144

/** Slice the original string only between complete UTF-8 characters. */
function splitLog(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  let offset = 0
  let size = 0
  for (const character of text) {
    const code = character.charCodeAt(0)
    const bytes =
      character.length === 2 ? 4 : code < 0x80 ? 1 : code < 0x800 ? 2 : 3
    if (size + bytes > LOG_ROW_BYTES) {
      chunks.push(text.slice(start, offset))
      start = offset
      size = 0
    }
    offset += character.length
    size += bytes
  }
  chunks.push(text.slice(start))
  return chunks
}

function logStatements(
  db: D1Database,
  buildId: string,
  text: string,
  now: number,
  onlyWhileRunning = false,
): D1PreparedStatement[] {
  const condition = onlyWhileRunning
    ? "HAVING EXISTS (SELECT 1 FROM image_builds WHERE id = ? AND state = 'running')"
    : ''
  return [
    ...splitLog(text).map((chunk) =>
      db
        .prepare(
          `INSERT INTO image_build_logs (build_id, event_number, occurred_at, text)
     SELECT ?, COALESCE(MAX(event_number), 0) + 1, ?, ? FROM image_build_logs WHERE build_id = ? ${condition}`,
        )
        .bind(
          buildId,
          now,
          chunk,
          buildId,
          ...(onlyWhileRunning ? [buildId] : []),
        ),
    ),
    ...buildLogRetentionStatements(db, buildId, now),
  ]
}

export function buildLogStatements(
  db: D1Database,
  buildId: string,
  text: string,
  now: number,
  onlyWhileRunning = false,
): D1PreparedStatement[] {
  return logStatements(
    db,
    buildId,
    hideMachineTokens(text),
    now,
    onlyWhileRunning,
  )
}

export function buildCommandLogStatements(
  db: D1Database,
  buildId: string,
  output: RedactedCommandOutput,
  now: number,
): D1PreparedStatement[] {
  return output.parts
    .filter(Boolean)
    .flatMap((text) => logStatements(db, buildId, text, now))
}
