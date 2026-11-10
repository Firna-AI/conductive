import type { BuildsResponse } from '../../shared/org-settings'
import type { OrgState } from './state'

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
  const captured =
    org.buildInputs.get(org.currentImageBuildId)?.repositories ?? []
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
