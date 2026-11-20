import { useCallback } from 'react'
import { useWorkspaceStore } from '../../../app/workspace-store'
import type { WorkspaceIdentity } from '../../../app/workspace-store'
import type { Repository } from '../../../shared/org-settings'
import { useOrgModel } from '../../context'
import type { WorkspaceContext } from '../features'
import { createRepositoryActions } from './repository-api'
import {
  RepositoryChange,
  type RepositoryChangeSnapshot,
} from './repository-change'

function connectChange(change: RepositoryChange): () => void {
  return change.connect()
}

/**
 * The repositories of the menu, in the order of New workspace: the current
 * one, and each other repository that the org chose and that the cloud
 * computer holds (repository change decision 4 G). Without a record of the
 * folders, `held` is null, and only the current repository shows.
 */
export function repositoryChoices(
  repositories: readonly Repository[] | undefined,
  held: readonly string[] | null,
  currentId: string,
): Repository[] {
  return (repositories ?? []).filter(
    (repository) =>
      repository.id === currentId ||
      (repository.selected && held !== null && held.includes(repository.id)),
  )
}

/**
 * The repository change of the open workspace, over the services of the
 * org and the ordered stream of the workspace. Another workspace gets a new
 * store, so no run or question of the old one stays.
 */
export function useRepositoryChange(context: WorkspaceContext): {
  change: RepositoryChange
  snapshot: RepositoryChangeSnapshot
} {
  const { services } = useOrgModel(context.org.id)
  const { stream, workspace } = context
  const create = useCallback(
    (target: WorkspaceIdentity) =>
      new RepositoryChange({
        actions: createRepositoryActions(services.api, target),
        delay: services.delay,
        streamLast: stream.last,
      }),
    [services, stream],
  )
  const { store, snapshot } = useWorkspaceStore(
    { orgId: context.org.id, workspaceId: workspace.id },
    { create, connect: connectChange },
  )
  return { change: store, snapshot }
}
