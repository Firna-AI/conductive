import type { ChatController } from '../../chat/state/controller'
import { ContinueDialog } from './ContinueDialog'
import { QueueQuestion } from './github/workspace-queue'
import type { WorkspaceContext } from './features'
import { LeaveMovedFiles } from './files/moved-files'
import { ResumeOnTabOpen } from './files/tab-open-resume'
import { RestoreShownTab, type TabRestore } from './restore-tab'
import { OpenSessionAddress } from './session-address'
import { ForgetClosedSkillViews } from './skills/skill-views'
import { WorkspacePaletteActions } from './WorkspacePaletteActions'

/**
 * The parts of the workspace screen that draw no place of their own: the
 * Continue dialog, the question of Remove from queue, the palette actions,
 * the restore of the shown tab, the Resume at a tab open, the way off a
 * file page of an old repository, the
 * session address, and the views of the skill tabs that close, in each
 * layout. The screen keeps `restore` for its whole show, so a new mount of
 * these parts restores nothing again.
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
      <QueueQuestion />
      <WorkspacePaletteActions chat={chat} context={context} />
      <RestoreShownTab context={context} restore={props.restore} />
      <ResumeOnTabOpen context={context} />
      <LeaveMovedFiles context={context} key={context.workspace.id} />
      <OpenSessionAddress
        chat={chat}
        context={context}
        session={props.session}
      />
      <ForgetClosedSkillViews context={context} />
    </>
  )
}
