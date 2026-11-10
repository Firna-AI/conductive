/**
 * The words of Get started. The screen of the app and its mockup share
 * them. They name the steps that remain and make no claim about earlier
 * use, because a person with no org can return here with steps done.
 */
export const getStartedCopy = {
  title: 'Get started',
  intro: (name: string) =>
    `Welcome, ${name}. Finish these steps to create a workspace.`,
  install: {
    title: '1. Install the GitHub App',
    description:
      'Install it on the GitHub account that owns your repositories, such as the organization of your company. You choose the repositories that it can reach.',
    action: 'Install the GitHub App',
    another: 'Add another account',
    done: 'Installed',
  },
  org: {
    title: '2. Create an org',
    description:
      'An org holds your workspaces, the repositories that they use, and their cloud computer.',
    action: 'Create org',
    done: 'Created',
  },
  /**
   * The cloud computer of the org, in the org step. Create org starts its
   * first build when the org has a repository.
   */
  computer: {
    label: 'Cloud computer',
    preparing: (elapsed: string) => `Preparing · ${elapsed}`,
    ready: 'Ready',
    failed: (duration: string) => `Failed after ${duration}`,
    none: 'No build yet',
    retry: 'Try again',
    log: 'Open the log',
    build: 'Build computer',
  },
  agent: {
    title: '3. Connect Claude or Codex',
    description:
      'Your agents run on your own Claude or OpenAI account. Connect at least one now, and the other at any time in your account.',
    done: 'Connected',
  },
  finish: (org: string) => `${org} is ready for a new workspace.`,
  /** The finish while the first build of the org runs. */
  finishPreparing: (org: string) =>
    `${org}'s cloud computer is still being prepared.`,
  /** The finish after the first build of the org failed. */
  finishFailed: (org: string) => `${org}'s cloud computer didn't build.`,
  /** The finish of an org with no build, such as after a start that failed. */
  finishNoBuild: (org: string) => `${org}'s cloud computer needs a build.`,
  open: (org: string) => `Open ${org}`,
} as const
