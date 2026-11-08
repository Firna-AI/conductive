import type { WorkspaceFeatures } from './features'
import { filesFeatures } from './files/files-features'
import { PullRequestPart } from './github/WorkspaceGitHub'
import { WorkspaceOwner } from './WorkspaceOwner'

/**
 * The parts that the app gives the workspace screen: the files, the pull
 * request bar or row, and the owner picker. A part of the host takes the
 * place of the app's own part. The screen draws its own tools panel when the
 * host gives no `tools` part, so that the panel keeps its tabs while the
 * sandbox does not run.
 */
export const appFeatures: WorkspaceFeatures = {
  ...filesFeatures,
  pullRequest: (context) => <PullRequestPart context={context} />,
  owner: (context) => <WorkspaceOwner context={context} />,
}
