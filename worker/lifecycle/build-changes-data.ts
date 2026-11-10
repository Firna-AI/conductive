import type { BuildsResponse } from '../../src/shared/org-settings'
import { publishedImageSource } from './published-image-data'
import { readRepositories, selectedRepositories } from './settings-data'

export async function readBuildChanges(
  db: D1Database,
  orgId: string,
  providerAccount: string,
): Promise<BuildsResponse['changes']> {
  const reference = await db
    .prepare(
      `WITH account_builds AS (
         SELECT id, kind, state, started_at FROM image_builds
         WHERE org_id = ? AND provider_account = ?
       ), image AS (
         SELECT s.org_id, j.repositories_json ${publishedImageSource}
         JOIN account_builds scoped ON scoped.id = b.id
       )
       SELECT image.repositories_json AS repositoriesJson,
       s.install_script != COALESCE((
         SELECT j.install_script FROM account_builds b
         JOIN image_build_jobs j ON j.build_id = b.id
         WHERE b.kind = 'build'
           AND (image.repositories_json IS NULL OR b.state = 'succeeded')
         ORDER BY b.started_at DESC, b.id DESC LIMIT 1
       ), s.install_script) AS installScript
       FROM settings s LEFT JOIN image ON image.org_id = s.org_id
       WHERE s.org_id = ?`,
    )
    .bind(orgId, providerAccount, orgId)
    .first<{ repositoriesJson: string | null; installScript: number }>()
  const installScript = reference?.installScript === 1
  if (!reference || reference.repositoriesJson === null)
    return { installScript, addedRepositories: [], removedRepositories: [] }
  const captured = readRepositories(
    JSON.parse(reference.repositoriesJson),
  ).filter((repository) => repository.orgId === orgId)
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
