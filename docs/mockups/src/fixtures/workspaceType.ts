import type { ActivityStatus } from '../../../../src/ui/components/workspaces/activityStatus'
import type { GitHubSummary } from '../../../../src/shared/generated/GitHubSummary'
import type { AgentChoice } from './agents'
import type { PersonKey } from './members'
import type { RepositoryKey } from './repositories'
import type { SectionKey } from './sections'

export type Workspace = {
  key: string
  /**
   * Its name. A new workspace has no name until its title comes, and the
   * screen then shows the label of `nameLabel` in `src/shared/`.
   */
  name: string
  /**
   * The number of the workspace in its org. It counts up from 1 in the
   * order of creation. The header and each chip show it as a label,
   * such as `W-395`.
   */
  number: number
  /**
   * The web address of the workspace, with the IDs of its org and of the
   * workspace. Copy link copies it, and a message keeps it under a chip,
   * so the label can change later.
   */
  link: string
  branch: string
  /**
   * The branch before the workspace has a name, when it differs from
   * `branch`. A new workspace starts on a branch with a city name, and the
   * branch takes the title when the title comes before the sandbox creates
   * the branch, as branch-name decision 1 says.
   */
  placeholderBranch?: string
  repository: RepositoryKey
  section: SectionKey
  /** The agent, model, and effort of its last message. */
  choice: AgentChoice
  /** The status in the workspace list when the app opens. */
  status: ActivityStatus
  /**
   * The GitHub state of its pull request when the app opens, which the
   * list mark shows in colour. `null` is a branch without a pull request,
   * a pull request without checks, or one closed without a merge.
   */
  github: GitHubSummary | null
  /** The time since the last activity, such as `2h`. */
  updated: string
  /**
   * The member who created it, until an admin reassigns it. Each session
   * keeps its login, the login of its starter or the org login, so a
   * reassign changes no login.
   */
  owner: PersonKey
  /**
   * The branch that its work goes to. Changes and each diff compare with
   * it from the merge base, and the pull request bar names it. Without
   * one, the default branch of the repository applies. A pull request run
   * gets the head branch of its pull request (decision 507 G).
   */
  baseBranch?: string
  /**
   * The stored base branch that GitHub no longer has, which the Worker
   * replaced with the default branch (decision 304). The line under the
   * pull request bar names it.
   */
  movedBase?: string
}
