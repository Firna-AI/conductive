import { workspacePath } from './workspaces'

export const mergeQueuePaths = {
  entry: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/merge-queue`,
  order: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/merge-queue/order`,
  merge: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/merge-queue/merge`,
}
