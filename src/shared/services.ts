import { workspacePath } from './workspaces'

export const SERVICE_APP_LOG_MAX_LINES = 200
export const SERVICE_APP_LOG_MAX_BYTES = 65_536

export const servicePaths = {
  catalogue: (orgId: string, workspaceId: string) =>
    `${workspacePath(orgId, workspaceId)}/services`,
  control: (orgId: string, workspaceId: string) =>
    `${workspacePath(orgId, workspaceId)}/services/control`,
  logs: (orgId: string, workspaceId: string) =>
    `${workspacePath(orgId, workspaceId)}/services/logs`,
}
