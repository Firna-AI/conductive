import type { AgentAction, OrgSteps } from '../components/workspace/barCopy'

/** The action whose steps Cal saves for Acme. */
export const acmeEditedAction = 'resolve-conflicts' satisfies AgentAction

/**
 * The steps of Resolve conflicts that Cal saves for Acme, whose team
 * rebases its branches. The facts still come after them, so the steps name
 * the target branch "below".
 */
export const acmeRebaseSteps = [
  '1. Fetch the target branch below from `origin`, and rebase this branch on it.',
  '2. Resolve each conflict, then run the tests.',
  '3. Push with `git push --force-with-lease`.',
  '',
  'Never merge the target branch into this branch.',
].join('\n')

/** Acme after Cal saved its own steps of Resolve conflicts. */
export const acmeSteps: OrgSteps = { [acmeEditedAction]: acmeRebaseSteps }
