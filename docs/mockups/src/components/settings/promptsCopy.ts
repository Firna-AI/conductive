import type { PromptFacts } from '../workspace/barCopy'

/**
 * The words of the Prompts tab of the org settings, where an admin replaces
 * the steps of each agent action of the pull request bar, or resets them to
 * the default. This module imports no fixture, so the app can take the
 * words from here too.
 */
export const promptsCopy = {
  title: 'Prompts',
  intro: (org: string) =>
    `The actions of the pull request bar send these steps to the agent, in every workspace of ${org}.`,
  /** The end of the intro for a member who is not an admin. */
  memberNote: ' Only an admin can change them.',
  edited: 'Edited',
  save: 'Save',
  reset: 'Reset to default',
  /**
   * The line above the part that the app adds. An action with facts shows
   * sample facts, so its lines are only like the lines of a press.
   */
  added: (facts: boolean) =>
    facts
      ? 'The app adds lines like these to each press:'
      : 'The app adds these lines to each press:',
  /** The spoken names of the box and the buttons of an action. */
  stepsLabel: (action: string) => `Steps of ${action}`,
  saveLabel: (action: string) => `Save the steps of ${action}`,
  resetLabel: (action: string) => `Reset the steps of ${action} to default`,
  /** The question before Reset to default. */
  resetQuestion: {
    title: (action: string) => `Reset ${action} to the default?`,
    body: (org: string) =>
      `Reset deletes the steps that ${org} saved for this action. Each press then sends the app's default steps.`,
    cancel: 'Cancel',
    confirm: 'Reset',
  },
} as const

/**
 * The facts that the tab shows in the part that the app adds. A press
 * adds the facts of its own pull request in their place.
 */
export const sampleFacts: PromptFacts = {
  number: 12,
  base: 'main',
  failedChecks: ['lint', 'test'],
  reviewers: ['alice'],
}
