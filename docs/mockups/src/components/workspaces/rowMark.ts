import type { MarkState } from '../../../../../src/ui/components/workspaces/WorkspaceMark'
import type { WorkspaceRow } from './sections'

/**
 * Every input of the list mark of a row, for the rows, the palette, and
 * the chips. Mokly takes only plain data, so a row without a waiting
 * message gives no `messageWaiting`.
 */
export function rowMarkOf(row: WorkspaceRow): MarkState {
  const { messageWaiting } = row.workspace
  return {
    github: row.github,
    status: row.status,
    ...(messageWaiting !== undefined && { messageWaiting }),
  }
}
