import type { ChatController } from '../../chat/state/controller'
import { ContinueDialog } from './ContinueDialog'
import type { WorkspaceContext } from './features'
import { LeaveMovedFiles } from './files/moved-files'
import { ResumeOnTabOpen } from './files/tab-open-resume'
import { OpenSessionAddress } from './session-address'
import { WorkspacePaletteActions } from './WorkspacePaletteActions'

/**
 * The parts of the workspace screen that draw no place of their own, in
 * each layout: the question of Continue, the palette actions, the resume
 * at the open of a file tab, the way off a file page of an old repository,
 * and the session of a session address.
 */
export function ScreenParts(props: {
  chat: ChatController
  context: WorkspaceContext
  /** The session that the address names. */
  session: string | undefined
}) {
  const { chat, context } = props
  return (
    <>
      <ContinueDialog />
      <WorkspacePaletteActions chat={chat} context={context} />
      <ResumeOnTabOpen context={context} />
      <LeaveMovedFiles context={context} key={context.workspace.id} />
      <OpenSessionAddress
        chat={chat}
        context={context}
        session={props.session}
      />
    </>
  )
}
