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
  agent: {
    title: '3. Connect Claude or Codex',
    description:
      'Your agents run on your own Claude or OpenAI account. Connect at least one now, and the other at any time in your account.',
    done: 'Connected',
  },
  finish: (org: string) => `${org} is ready for a new workspace.`,
  open: (org: string) => `Open ${org}`,
} as const
