import { readyWorkspace, type WorkspaceState } from './workspaceState'

/**
 * The workspace of the pages of the services: the Preview tool with the
 * services that run, beside the Preview tab of port 3000 on desktop. A
 * phone shows the Preview page after "+", where the list stands under the
 * tabs of the open previews. The pages change the services from here.
 */
export const servicesWorkspace: WorkspaceState = {
  ...readyWorkspace,
  banner: 'none',
  tool: 'preview',
  ports: 'adding',
  tab: 'preview',
  focus: 'tool',
  services: 'running',
}
