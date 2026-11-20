export interface ProviderAssignmentSetting {
  weightsJson: string
  updatedAt: number | null
  updatedByUserId: string | null
}

export async function readProviderAssignmentSetting(
  db: D1Database,
): Promise<ProviderAssignmentSetting> {
  const row = await db
    .prepare(
      `SELECT weights_json AS weightsJson, updated_at AS updatedAt,
       updated_by_user_id AS updatedByUserId
       FROM provider_assignment_settings WHERE id = 1`,
    )
    .first<ProviderAssignmentSetting>()
  if (!row)
    throw new Error('The provider assignment settings are not available')
  return row
}

export async function changeProviderAssignmentSetting(
  db: D1Database,
  expectedWeightsJson: string,
  weightsJson: string,
  operatorId: string,
  now: number,
): Promise<boolean> {
  const result = await db.batch([
    db
      .prepare(
        `INSERT INTO provider_assignment_events (weights_json, changed_at, operator_user_id)
       SELECT ?, ?, ? FROM provider_assignment_settings
       WHERE id = 1 AND weights_json = ?`,
      )
      .bind(weightsJson, now, operatorId, expectedWeightsJson),
    db
      .prepare(
        `UPDATE provider_assignment_settings SET weights_json = ?, updated_at = ?, updated_by_user_id = ?
       WHERE id = 1 AND weights_json = ?`,
      )
      .bind(weightsJson, now, operatorId, expectedWeightsJson),
  ])
  return result[1].meta.changes === 1
}
