import type { ChatController } from '../../chat/state/controller'
import { ContinueDialog } from './ContinueDialog'
import type { WorkspaceContext } from './features'
import { ResumeOnTabOpen } from './files/tab-open-resume'
import { RestoreShownTab, type TabRestore } from './restore-tab'
import { OpenSessionAddress } from './session-address'
import { WorkspacePaletteActions } from './WorkspacePaletteActions'

/**
 * The parts of the workspace screen that draw no place of their own: the
 * Continue dialog, the palette actions, the restore of the shown tab, the
 * Resume at a tab open, and the session address. The screen keeps
 * `restore` for its whole show, so a new mount of these parts restores
 * nothing again.
 */
export function ScreenAddons(props: {
  chat: ChatController
  context: WorkspaceContext
  restore: TabRestore
  session: string | undefined
}) {
  const { chat, context } = props
  return (
    <>
      <ContinueDialog />
      <WorkspacePaletteActions chat={chat} context={context} />
      <RestoreShownTab context={context} restore={props.restore} />
      <ResumeOnTabOpen context={context} />
      <OpenSessionAddress
        chat={chat}
        context={context}
        session={props.session}
      />
    </>
  )
}
