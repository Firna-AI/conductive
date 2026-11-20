import type {
  DeviceSettingsAction,
  DeviceSettingsOperation,
} from '../../src/shared/device'
import { requireActiveOrg } from '../data/user-access'
import { HttpError } from '../http'
import { requireOrgMember } from '../members/permissions'
import { readMacAccessWorkspace } from './mac-access-data'

export async function settingsOperation(
  db: D1Database,
  userId: string,
  action: DeviceSettingsAction,
): Promise<DeviceSettingsOperation> {
  if (action.action === 'start-workspace-until-stop') {
    const workspace = await readMacAccessWorkspace(db, action.workspaceId)
    if (
      !workspace ||
      workspace.archivedAt !== null ||
      workspace.state === 'archived'
    )
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    await requireOrgMember(db, workspace.orgId, userId)
    await requireActiveOrg(db, workspace.orgId)
    return {
      ...action,
      workspaceName: workspace.name,
    }
  }
  return action
}
