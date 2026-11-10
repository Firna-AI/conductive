import { workspacePath, type Workspace } from '../shared/workspaces'
import { readWorkspaceResponse } from './api/read-workspaces'
import { ArchiveModel } from './archive-model'
import {
  workspaceArchived,
  workspaceReassigned,
  workspaceRenamed,
} from './list-changes'
import type { OrgModel } from './org-model'
import { same } from './resource'

/** The writes of workspace rows, without opening their workspaces. */
export class WorkspaceActions {
  private readonly org: OrgModel
  private readonly archives = new Map<string, ArchiveModel>()

  constructor(org: OrgModel) {
    this.org = org
  }

  async rename(workspaceId: string, name: string): Promise<Workspace> {
    const detail = await this.org.resources.list.write(
      same,
      () =>
        this.org.services.api.send(
          'PATCH',
          workspacePath(this.org.orgId, workspaceId),
          { name },
          readWorkspaceResponse,
        ),
      ({ workspace }) => workspaceRenamed(workspace.id, workspace.name),
    )
    return detail.workspace
  }

  /** Confirms only the owner of the members API's reply. */
  reassigned(workspace: Workspace): void {
    this.org.resources.list.confirm(
      workspaceReassigned(workspace.id, workspace.owner),
      `workspace owner ${workspace.id}`,
    )
  }

  /** Confirms Archive state and advances activity without replacing newer fields. */
  archived(workspace: Workspace): void {
    this.org.resources.list.confirm(
      workspaceArchived(workspace),
      `workspace archive ${workspace.id}`,
    )
  }

  /** The Archive question of a row that has no kept workspace model. */
  archive(workspaceId: string): ArchiveModel {
    let archive = this.archives.get(workspaceId)
    if (!archive) {
      archive = new ArchiveModel(this.org, workspaceId, (detail) =>
        this.archived(detail.workspace),
      )
      this.archives.set(workspaceId, archive)
    }
    return archive
  }
}
