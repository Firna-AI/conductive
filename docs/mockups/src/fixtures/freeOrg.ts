/**
 * Firna, the org that the user made at sign-up, on the Free plan. It keeps
 * the most workspaces that Free allows, and their cloud computers are
 * stopped.
 */

import { defaultChoice } from './agents'
import type { Workspace } from './workspaces'

function workspace(
  key: string,
  name: string,
  details: Pick<Workspace, 'repository' | 'updated'>,
): Workspace {
  return {
    key,
    name,
    branch: `cal/${key}`,
    section: 'general',
    choice: defaultChoice,
    status: 'stopped',
    owner: 'cal',
    ...details,
  }
}

/** The workspaces of Firna, newest first. */
export const firnaWorkspaces: readonly Workspace[] = [
  workspace('focus-ring', 'Focus ring for buttons', {
    repository: 'components',
    updated: '2h',
  }),
  workspace('docs-search', 'Search for the docs', {
    repository: 'docs',
    updated: '1d',
  }),
  workspace('icon-sizes', 'Icon size tokens', {
    repository: 'components',
    updated: '4d',
  }),
]
