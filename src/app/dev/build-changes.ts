import type { BuildsResponse, Repository } from '../../shared/org-settings'
import type { OrgState } from './state'

/**
 * The repositories that the current org image holds, from the inputs of
 * its build, as the Worker reads them from the published image. Before the
 * first good build, the org has no image, so none.
 */
export function imageRepositories(
  org: OrgState,
): readonly Pick<Repository, 'id' | 'fullName'>[] {
  if (org.currentImageBuildId === null) return []
  return org.buildInputs.get(org.currentImageBuildId)?.repositories ?? []
}

export function buildChanges(org: OrgState): BuildsResponse['changes'] {
  const reference = org.builds.find(
    ({ build }) =>
      build.kind === 'build' &&
      (org.currentImageBuildId === null || build.state === 'succeeded'),
  )
  const script =
    reference && org.buildInputs.get(reference.build.id)?.installScript
  const installScript =
    script !== undefined && script !== org.settings.installScript
  if (org.currentImageBuildId === null)
    return { installScript, addedRepositories: [], removedRepositories: [] }
  const captured = imageRepositories(org)
  const selected = org.repositories.filter((repository) => repository.selected)
  const capturedIds = new Set(captured.map((repository) => repository.id))
  const selectedIds = new Set(selected.map((repository) => repository.id))
  return {
    installScript,
    addedRepositories: selected
      .filter((repository) => !capturedIds.has(repository.id))
      .map(({ id, fullName }) => ({ id, fullName })),
    removedRepositories: captured.filter(
      (repository) => !selectedIds.has(repository.id),
    ),
  }
}
