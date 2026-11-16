import type { Workspace } from '../../shared/generated/Workspace'
import {
  parentOf,
  subWorkspaceList,
} from '../../../docs/mockups/src/fixtures/subWorkspaces'
import { FAKE_TIME } from './core'
import { workspaceRecord } from './workspaces'

const MINUTE = 60_000

/**
 * The sub-workspaces of Acme that the mockups draw at `app/sub-workspaces`.
 * Address search API and Suggestion list are under Checkout address
 * autocomplete, Places API client under Address search API, and Rate
 * limits with its sibling Rate limits: Load test under Places API client,
 * at depth 3. Merchant validation and Wallet button tests are under Apple
 * Pay button. Each has the parent that its create named. They were made in
 * the order of their numbers, an hour apart, after every other workspace
 * of Acme.
 */
function subWorkspaceFixtures(): Workspace[] {
  const newest = Math.max(...subWorkspaceList.map(({ number }) => number))
  return subWorkspaceList.map((workspace) => ({
    ...workspaceRecord(workspace, {
      createdAt: FAKE_TIME - (newest + 1 - workspace.number) * 60 * MINUTE,
      updatedAt: FAKE_TIME - (newest - workspace.number) * MINUTE,
    }),
    parentId: parentOf.get(workspace.key) ?? null,
  }))
}

/**
 * The workspaces of Acme with its sub-workspaces, in the order of the list
 * of the Worker. A create puts a new workspace at the top of its section,
 * so the sub-workspaces come first in Checkout, the newest first.
 */
export function withSubWorkspaces(
  workspaces: readonly Workspace[],
): Workspace[] {
  let list = [...workspaces]
  for (const added of subWorkspaceFixtures()) {
    const top = list.findIndex(({ sectionId }) => sectionId === added.sectionId)
    list = list.toSpliced(top < 0 ? list.length : top, 0, added)
  }
  return list
}
