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
  FROM image_build_logs WHERE build_id = ? AND omitted_bytes IS NULL
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
  // Hold the replacement at a negative key until its public number is free.
  // The enclosing batch keeps this move atomic with output and job state.
  return [
    db
      .prepare(
        `${omittedRows}, omission AS (
          SELECT -MAX(event_number) AS temporary_key,
            COALESCE((SELECT omitted_bytes FROM image_build_logs
              WHERE build_id = ? AND omitted_bytes IS NOT NULL), 0)
              + SUM(bytes) AS bytes
          FROM omitted HAVING COUNT(*) > 0
        )
        INSERT INTO image_build_logs
          (build_id, event_number, occurred_at, text, omitted_bytes)
        SELECT ?, temporary_key, ?,
          CHAR(10) || '[' || bytes || ' output bytes omitted]' || CHAR(10), bytes
        FROM omission`,
      )
      .bind(buildId, buildId, buildId, now),
    db
      .prepare(
        `${omittedRows}
        DELETE FROM image_build_logs WHERE build_id = ?
          AND (event_number IN (SELECT event_number FROM omitted)
            OR (omitted_bytes IS NOT NULL AND event_number > 0
              AND EXISTS (SELECT 1 FROM omitted)))`,
      )
      .bind(buildId, buildId),
    db
      .prepare(
        `UPDATE image_build_logs SET event_number = -event_number
        WHERE build_id = ? AND event_number < 0 AND omitted_bytes IS NOT NULL`,
      )
      .bind(buildId),
  ]
}
