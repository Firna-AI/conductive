import { postcodeLookup } from '../../../docs/mockups/src/fixtures/archivedWorkspaces'
import { routes } from '../../app/router'
import type { Workspace } from '../../shared/generated/Workspace'
import { WORKSPACE_RESTORE_MS } from '../../shared/workspaces'
import { FAKE_IDS, FAKE_ORIGIN, FAKE_TIME, fakeUser, fakeUsers } from './core'

const DAY = 86_400_000

/** The Archive of the removed workspace: 3 weeks before `FAKE_TIME`. */
export const REMOVED_ARCHIVED_AT = FAKE_TIME - 21 * DAY

/**
 * Postcode lookup for the shipping and billing forms of the mockups, which
 * Cal archived 3 weeks before `FAKE_TIME`. Its 14 days ended a week before
 * that time, so it left the list, and the app deleted its cloud computer.
 * The list of the org still holds it, as the Worker sends it, so a link
 * and a chip still open its read-only chat.
 */
export function removedWorkspace(): Workspace {
  return {
    id: postcodeLookup.key,
    number: postcodeLookup.number,
    link: new URL(
      routes.workspace(FAKE_IDS.org, postcodeLookup.key),
      FAKE_ORIGIN,
    ).href,
    orgId: FAKE_IDS.org,
    repositoryId: postcodeLookup.repository,
    sectionId: postcodeLookup.section,
    parentId: null,
    owner:
      fakeUsers.find((user) => user.id === postcodeLookup.owner) ?? fakeUser,
    name: postcodeLookup.name,
    branch: postcodeLookup.branch,
    choice: {
      ...postcodeLookup.choice,
      fast: postcodeLookup.choice.fast ?? false,
    },
    state: 'archived',
    github: postcodeLookup.github,
    createdAt: REMOVED_ARCHIVED_AT - 5 * DAY,
    // The delete of the cloud computer at the end of Restore raised the
    // time of the record, as the Worker does.
    updatedAt: REMOVED_ARCHIVED_AT + WORKSPACE_RESTORE_MS,
    archivedAt: REMOVED_ARCHIVED_AT,
    restoreUntil: null,
  }
}
