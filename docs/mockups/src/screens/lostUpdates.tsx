import type { ReactNode } from 'react'
import { LostUpdateBar, LostUpdateRow } from '../components/chat/LostUpdate'
import {
  changesUnavailable,
  titleUnavailable,
} from '../fixtures/lostConversations'
import type { WorkspaceState } from './workspaceState'

/** The parts of the workspace screen that a notice can join. */
type Parts = { header: ReactNode; files: ReactNode }

/**
 * Adds the notices of a failed repair (decision 96) to the workspace: the
 * data that stays unavailable after an update without a session and its
 * fresh full report were both lost. The notice of a file list joins the file
 * lists, and the notice of other data, such as the workspace name, joins the
 * header. In every other state nothing shows, also after a lost update whose
 * fresh report arrives. The shared header and Files panel stay as they are.
 */
export function placeLostUpdate(state: WorkspaceState, parts: Parts): Parts {
  switch (state.lostUpdate) {
    case 'none':
      return parts
    case 'failed-repair':
      return {
        header: (
          <>
            {parts.header}
            <LostUpdateBar repair={titleUnavailable} />
          </>
        ),
        files: (
          <>
            {parts.files}
            <LostUpdateRow repair={changesUnavailable} />
          </>
        ),
      }
  }
}
