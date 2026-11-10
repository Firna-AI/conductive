import type { BuildsResponse } from '../../src/shared/org-settings'
import { publishedImageSource } from './published-image-data'
import { readRepositories, selectedRepositories } from './settings-data'

export async function readBuildChanges(
  db: D1Database,
  orgId: string,
  providerAccount: string,
): Promise<BuildsResponse['changes']> {
  const image = await db
    .prepare(
      `SELECT j.repositories_json AS repositoriesJson
       ${publishedImageSource} WHERE s.org_id = ? AND i.provider_account = ?`,
    )
    .bind(orgId, providerAccount)
    .first<{ repositoriesJson: string }>()
  const reference = await db
    .prepare(
      `SELECT s.install_script != COALESCE((
         SELECT j.install_script FROM image_builds b
         JOIN image_build_jobs j ON j.build_id = b.id
         WHERE b.org_id = s.org_id AND b.kind = 'build'
           AND (? = 0 OR b.state = 'succeeded')
         ORDER BY b.started_at DESC, b.id DESC LIMIT 1
       ), s.install_script) AS installScript
       FROM settings s WHERE s.org_id = ?`,
    )
    .bind(image ? 1 : 0, orgId)
    .first<{ installScript: number }>()
  const installScript = reference?.installScript === 1
  if (!image)
    return { installScript, addedRepositories: [], removedRepositories: [] }
  const captured = readRepositories(JSON.parse(image.repositoriesJson)).filter(
    (repository) => repository.orgId === orgId,
  )
  const selected = await selectedRepositories(db, orgId)
  const capturedIds = new Set(captured.map((repository) => repository.id))
  const selectedIds = new Set(selected.map((repository) => repository.id))
  const summary = ({ id, fullName }: { id: string; fullName: string }) => ({
    id,
    fullName,
  })
  return {
    installScript,
    addedRepositories: selected
      .filter((repository) => !capturedIds.has(repository.id))
      .map(summary),
    removedRepositories: captured
      .filter((repository) => !selectedIds.has(repository.id))
      .map(summary),
  }
}
