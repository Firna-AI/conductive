import type {
  DeviceSettingsAction,
  DeviceSettingsOperation,
} from '../../src/shared/device'
import { requireActiveOrg } from '../data/user-access'
import { HttpError } from '../http'
import { requireOrgMember } from '../members/permissions'
import {
  readMacAccessWorkspace,
  workspaceMacAccessPeriod,
} from './mac-access-data'
import { MAC_ACCESS_OFF } from './mac-access'

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
    if (workspace.macAccess !== 1)
      throw new HttpError(403, MAC_ACCESS_OFF.code, MAC_ACCESS_OFF.message)
    return {
      ...action,
      workspaceName: workspace.name,
      macAccessPeriod: workspace.macAccessPeriod,
    }
  }
  if (
    action.action === 'keep-workspace' ||
    action.action === 'extend-workspace'
  ) {
    const macAccessPeriod = await workspaceMacAccessPeriod(
      db,
      action.workspaceId,
    )
    if (macAccessPeriod !== undefined) return { ...action, macAccessPeriod }
  }
  return action
}
