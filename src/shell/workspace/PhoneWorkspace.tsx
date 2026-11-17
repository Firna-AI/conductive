import type { ReactNode } from 'react'
import page from '../../../docs/mockups/src/screens/WorkspaceScreen.module.css'
import type { WorkspaceContext } from './features'
import { useFeatures } from './features'
import { KeptFilesConnection } from './files/kept-files'
import { WorkspaceGitHub } from './github/WorkspaceGitHub'
import { WorkspaceLinks } from './link-opening'
import { PhoneTabBar, phoneView } from './WorkspaceColumns'

/**
 * An open workspace on a phone: the header and its notices, the pull
 * request row, then one view at a time, the chat, the files, or a tool, as
 * the address names it, with the tabs at the bottom to switch. An archived
 * workspace shows only its chat, with no tabs: no pull request row and no
 * Checks, so it reads no GitHub state and no files.
 */
export function PhoneWorkspace(props: {
  context: WorkspaceContext
  /** The header and the notice bars under it. */
  top: ReactNode
  chat: ReactNode
  files: ReactNode
  tool: ReactNode
  /** The dialogs and the parts of the screen that draw nothing. */
  dialog: ReactNode
}) {
  const { context } = props
  const features = useFeatures()
  const view = phoneView(context.view)
  const archived = context.sandbox === 'archived'
  const screen = (
    <WorkspaceLinks context={context}>
      <div className={page.mobileBody}>
        {props.top}
        {features.pullRequest?.(context)}
        <div className={page.mobileBody}>
          {archived || view === 'chat'
            ? props.chat
            : view === 'files'
              ? props.files
              : props.tool}
        </div>
        {archived ? null : <PhoneTabBar context={context} />}
        {props.dialog}
      </div>
    </WorkspaceLinks>
  )
  if (archived) return screen
  return (
    <KeptFilesConnection context={context}>
      <WorkspaceGitHub context={context}>{screen}</WorkspaceGitHub>
    </KeptFilesConnection>
  )
}
