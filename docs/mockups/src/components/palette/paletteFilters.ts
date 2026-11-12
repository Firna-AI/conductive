import { orgs } from '../../fixtures/orgs'
import { repositories, type RepositoryKey } from '../../fixtures/repositories'
import type { OpenPaletteView } from './paletteViews'

/** The two filters of the Workspaces tab. */
export type PaletteFilters = {
  repository: string
  state: 'Active' | 'Archived'
  /** The menu of the repository filter lies open. */
  repositoryMenu: boolean
}

const allRepositories = 'All repositories'

/** The repository that the empty Workspaces tab chooses. */
export const emptyRepository: RepositoryKey = 'marketing-site'

/** The filters of the Workspaces tab in one view of the palette. */
export function filters(view: OpenPaletteView): PaletteFilters {
  const empty = view === 'workspaces-empty'
  return {
    repository: empty ? repositories[emptyRepository].name : allRepositories,
    state: view === 'workspaces-archived' || empty ? 'Archived' : 'Active',
    repositoryMenu: view === 'workspaces-repository',
  }
}

/**
 * The line of the Workspaces tab when it has no workspace to show and the
 * field is empty. It says where the workspaces of the filters show: in the
 * chosen repository, or in the org.
 */
export function emptyLine(filters: PaletteFilters): string {
  const place =
    filters.repository === allRepositories ? orgs.acme.name : filters.repository
  return filters.state === 'Archived'
    ? `Archived workspaces of ${place} show here`
    : `Workspaces of ${place} show here`
}
