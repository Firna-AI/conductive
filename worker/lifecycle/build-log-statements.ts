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

export function buildLogStatements(
  db: D1Database,
  buildId: string,
  text: string,
  now: number,
): D1PreparedStatement[] {
  return splitLog(text).map((chunk) =>
    db
      .prepare(
        `INSERT INTO image_build_logs (build_id, event_number, occurred_at, text)
     SELECT ?, COALESCE(MAX(event_number), 0) + 1, ?, ? FROM image_build_logs WHERE build_id = ?`,
      )
      .bind(buildId, now, chunk, buildId),
  )
}
