export function readRunnerProtocolVersion(
  db: D1Database,
  workspaceId: string,
): Promise<number | null> {
  return db
    .prepare(
      `SELECT COALESCE(runner_protocol_version, 1) AS runnerProtocolVersion
       FROM workspaces WHERE id = ?`,
    )
    .bind(workspaceId)
    .first<number>('runnerProtocolVersion')
}
