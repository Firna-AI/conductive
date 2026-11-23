import type { ReactNode } from 'react'
import {
  lostUpdateBar,
  lostUpdateRow,
} from '../entries/components/chat/LostUpdate.mockup'
import {
  changesUnavailable,
  titleUnavailable,
} from '../fixtures/lostConversations'
import type { WorkspaceState } from './workspaceState'

/** The parts of the workspace screen that a notice can join. */
type Parts = { header: ReactNode; files: ReactNode }

/** The file lists with the notice of a failed repair of Changes under them. */
function withChangesNotice(files: ReactNode): ReactNode {
  return (
    <>
      {files}
      <lostUpdateRow.Component
        moklyInstance="lost-changes"
        repair={changesUnavailable}
      />
    </>
  )
}

/**
 * Adds the notices of a failed repair (decision 96) to the workspace: the
 * data that stays unavailable after an update without a session and its
 * fresh full report were both lost. The notice of a file list joins the file
 * lists, and the notice of other data, such as the workspace name, joins the
 * header. In every other state nothing shows, also after a lost update whose
 * fresh report arrives. The shared header and Files panel stay as they are.
 * `changes-repair` adds only the notice of Changes.
 */
export function placeLostUpdate(state: WorkspaceState, parts: Parts): Parts {
  switch (state.lostUpdate) {
    case 'none':
      return parts
    case 'changes-repair':
      return { header: parts.header, files: withChangesNotice(parts.files) }
    case 'failed-repair':
      return {
        header: (
          <>
            {parts.header}
            <lostUpdateBar.Component
              moklyInstance="lost-title"
              repair={titleUnavailable}
            />
          </>
        ),
        files: withChangesNotice(parts.files),
      }
  }
}
