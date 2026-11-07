const LOG_TOTAL_BYTES = 4_194_304
const LOG_ROW_COST = 128
const LOG_MARKER_COST = 256
const LOG_END_BYTES = (LOG_TOTAL_BYTES - LOG_MARKER_COST) / 2

// The first gap fixes the prefix boundary after the first omission. Later
// short rows must not move the tail into that prefix. Row cost also bounds
// the number of tiny or empty rows. The marker always fits its allowance.
const omittedRows = `WITH log_rows AS (
  SELECT event_number, LENGTH(CAST(text AS BLOB)) AS bytes,
    LAG(event_number, 1, 0) OVER (ORDER BY event_number) AS previous,
    SUM(LENGTH(CAST(text AS BLOB)) + ${LOG_ROW_COST})
      OVER (ORDER BY event_number) AS prefix_cost,
    SUM(LENGTH(CAST(text AS BLOB)) + ${LOG_ROW_COST})
      OVER (ORDER BY event_number DESC) AS suffix_cost
  FROM image_build_logs WHERE build_id = ? AND event_number > 0
), omitted AS (
  SELECT event_number, bytes FROM log_rows
  WHERE (SELECT SUM(bytes + ${LOG_ROW_COST}) FROM log_rows)
    > ${LOG_TOTAL_BYTES - LOG_MARKER_COST}
  AND NOT (
    (prefix_cost <= ${LOG_END_BYTES}
      AND event_number <= COALESCE(
        (SELECT MIN(previous) FROM log_rows WHERE event_number > previous + 1),
        event_number))
    OR suffix_cost <= ${LOG_END_BYTES}
  )
)`

/** Append these statements to the same batch as the output and job state. */
export function buildLogRetentionStatements(
  db: D1Database,
  buildId: string,
  now: number,
): D1PreparedStatement[] {
  return [
    db
      .prepare(
        `${omittedRows}
        INSERT INTO image_build_logs (build_id, event_number, occurred_at, text)
        SELECT ?, 0, ?, CHAR(10) || '[' || (
          COALESCE((SELECT CAST(SUBSTR(text, 3) AS INTEGER)
            FROM image_build_logs WHERE build_id = ? AND event_number = 0), 0)
          + SUM(bytes)
        ) || ' output bytes omitted]' || CHAR(10)
        FROM omitted HAVING COUNT(*) > 0
        ON CONFLICT (build_id, event_number) DO UPDATE SET
          occurred_at = excluded.occurred_at, text = excluded.text`,
      )
      .bind(buildId, buildId, now, buildId),
    db
      .prepare(
        `${omittedRows}
        DELETE FROM image_build_logs WHERE build_id = ?
          AND event_number IN (SELECT event_number FROM omitted)`,
      )
      .bind(buildId, buildId),
  ]
}
