import type { ReactNode } from 'react'
import {
  LostUpdateBar,
  LostUpdateRow,
  type LostUpdateMarker,
} from '../components/chat/LostUpdate'
import { lostChanges, lostTitle } from '../fixtures/lostConversations'
import type { WorkspaceState } from './workspaceState'

/** The parts of the workspace screen that a lost update can join. */
type Parts = { header: ReactNode; files: ReactNode }

function underFiles(parts: Parts, marker: LostUpdateMarker): Parts {
  return {
    ...parts,
    files: (
      <>
        {parts.files}
        <LostUpdateRow marker={marker} />
      </>
    ),
  }
}

function underHeader(parts: Parts, marker: LostUpdateMarker): Parts {
  return {
    ...parts,
    header: (
      <>
        {parts.header}
        <LostUpdateBar marker={marker} />
      </>
    ),
  }
}

/**
 * Adds the line of an update that belongs to no session to the part of the
 * workspace that the state chooses: under the file lists, under the header,
 * or, in the contextual option, a lost Changes report under the file lists
 * and a lost workspace name under the header. The shared header and Files
 * panel stay as they are.
 */
export function placeLostUpdate(state: WorkspaceState, parts: Parts): Parts {
  switch (state.lostUpdate) {
    case 'none':
      return parts
    case 'files':
      return underFiles(parts, lostChanges)
    case 'header':
      return underHeader(parts, lostChanges)
    case 'contextual':
      return underHeader(underFiles(parts, lostChanges), lostTitle)
  }
}
