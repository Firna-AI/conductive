interface SettingRow {
  weightsJson: string
  updatedAt: number | null
  githubId: number | null
  login: string | null
}

interface OrgCount {
  id: string
  orgs: number
}

export async function operatorProviderData(db: D1Database) {
  const [setting, orgs] = await db.batch<SettingRow | OrgCount>([
    db.prepare(
      `SELECT s.weights_json AS weightsJson, s.updated_at AS updatedAt,
       u.github_id AS githubId, u.github_login AS login
       FROM provider_assignment_settings s LEFT JOIN users u ON u.id = s.updated_by_user_id
       WHERE s.id = 1`,
    ),
    db.prepare(
      'SELECT provider_account AS id, COUNT(*) AS orgs FROM orgs GROUP BY provider_account',
    ),
  ])
  const row = setting.results[0]
  if (!row || !('weightsJson' in row))
    throw new Error('The provider assignment settings are not available')
  return {
    setting: row,
    orgs: new Map(
      orgs.results.map((row) => {
        if (!('orgs' in row)) throw new Error('Invalid provider org count')
        return [row.id, row.orgs]
      }),
    ),
  }
}
