import { setupStates } from '../components/workspace/updateCopy'
import { startErrorKeys } from '../fixtures/starting'

/**
 * The parts of the workspace state that come from its cloud computer: the
 * state of the sandbox, a failed start, and the updates of an old
 * workspace. `workspaceState.ts` spreads them into the schema of the
 * workspace screen.
 */
export const computerStateProps = {
  /**
   * The cloud computer. `archived` is a cloud computer that Archive
   * stopped, as `archive` says, and the workspace shows none of it.
   * `refused` is a stopped cloud computer whose start the app refuses,
   * such as while the owner of the workspace is suspended.
   */
  sandbox: {
    enum: ['ready', 'starting', 'stopped', 'error', 'refused', 'archived'],
  },
  /**
   * The message that the app saved for a start that failed, which the
   * error state shows: a failure, or the 20-minute limit of a start.
   */
  startError: { enum: startErrorKeys },
  /**
   * The agent and terminal software of the workspace (image job decision
   * 8 B): the current version, or an earlier one, so a
   * start updates it before the agent starts. After `update-failed`, the
   * start goes on with the earlier version: the start marks the step, and
   * the ready workspace shows a warning bar under its header.
   */
  software: { enum: ['current', 'earlier', 'update-failed'] },
  /**
   * The install script of the org image that the workspace started from
   * (decision 11 C of that plan): the current one, or one that an admin
   * changed and built since. A changed script shows a notice over the
   * composer of the ready workspace, whose action runs the current script
   * here: before the run, while it runs, after it finished, or after it
   * failed.
   */
  setup: { enum: setupStates },
} as const
