import type { WorkspaceFeatures } from './features'
import { filesFeatures } from './files/files-features'
import { PullRequestPart } from './github/WorkspaceGitHub'
import { ToolsPart } from './tools/ToolsPart'
import { WorkspaceOwner } from './WorkspaceOwner'

/**
 * The parts that the app gives the workspace screen: the files, the tools,
 * the pull request bar or row, and the owner picker. A part of the host
 * takes the place of the app's own part.
 */
export const appFeatures: WorkspaceFeatures = {
  ...filesFeatures,
  tools: (context) => <ToolsPart context={context} />,
  pullRequest: (context) => <PullRequestPart context={context} />,
  owner: (context) => <WorkspaceOwner context={context} />,
}
