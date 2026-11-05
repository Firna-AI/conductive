import {
  repositories,
  repositoryKeys,
  type BaseStatus,
  type Repository,
} from '../../fixtures/repositories'
import {
  workspaceList,
  type ActivityStatus,
  type Workspace,
} from '../../fixtures/workspaces'
import { paths } from '../../paths'

export type WorkspaceRow = {
  workspace: Workspace
  status: ActivityStatus
  selected: boolean
  /** The screen that opening this workspace shows, when the mockups draw it. */
  to?: string
}

export type WorkspaceGroup = {
  repository: Repository
  rows: readonly WorkspaceRow[]
  settingsTo?: string
}

/** The workspace that the main area shows, with its current status. */
export type OpenWorkspace = { workspace: Workspace; status: ActivityStatus }

function linkFor(key: string, open: boolean): string | undefined {
  if (key === 'checkout-autocomplete') return open ? paths.app : paths.starting
  if (key === 'saved-carts') return paths.firstTurn
  return undefined
}

/**
 * The workspace list, one group for each repository. The open workspace
 * shows its current status, and a new one joins the top of its group.
 */
export function workspaceGroups(
  options: { open?: OpenWorkspace; storefrontBase?: BaseStatus } = {},
): WorkspaceGroup[] {
  const { open, storefrontBase } = options
  return repositoryKeys.map((key) => {
    const listed = workspaceList.filter((item) => item.repository === key)
    const isNew =
      open !== undefined &&
      open.workspace.repository === key &&
      !listed.some((item) => item.key === open.workspace.key)
    const workspaces = isNew ? [open.workspace, ...listed] : listed
    const rows = workspaces.map((workspace) => {
      const isOpen = open !== undefined && workspace.key === open.workspace.key
      return {
        workspace,
        status: isOpen ? open.status : workspace.status,
        selected: isOpen,
        to: linkFor(workspace.key, isOpen),
      }
    })
    const repository = repositories[key]
    const base =
      key === 'storefront' && storefrontBase ? storefrontBase : repository.base
    return {
      repository: { ...repository, base },
      rows,
      settingsTo: key === 'storefront' ? paths.settings : undefined,
    }
  })
}
