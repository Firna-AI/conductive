import { useEffect, useState, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert, SearchX } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import body from '../../../docs/mockups/src/components/workspace/WorkspaceBody.module.css'
import page from '../../../docs/mockups/src/screens/WorkspaceScreen.module.css'
import { mayArchive } from '../../app/permissions'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import { WorkspaceModel } from '../../app/workspace-model'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { useAction } from '../ui/useAction'
import { useViewport } from '../ui/viewport'
import { ArchiveDialog } from './ArchiveDialog'
import { sandboxState, useFeatures, type WorkspaceContext } from './features'
import { HeaderNotices } from './header-notices'
import { HeaderNoticeBars } from './HeaderNoticeBars'
import { SandboxBar, SandboxPanel } from './SandboxNotice'
import { StartingCard } from './StartingCard'
import {
  ChatColumn,
  PhoneTabBar,
  phoneView,
  RightColumn,
} from './WorkspaceColumns'
import { WorkspaceHeader } from './WorkspaceHeader'
import workspaceStyles from './workspace.module.css'

/**
 * An open workspace. Desktop shows the chat column beside the right column;
 * a phone shows one view at a time, with five tabs to switch. The shell draws
 * the header, the start steps, and the states of the sandbox. Later
 * milestones fill the chat, the files, the tools, and the pull request bar.
 */
export function WorkspaceScreen(props: {
  org: OrgSummary
  workspaceId: string
  view: readonly string[]
  viewer: User
}) {
  const org = useOrgModel(props.org.id)
  const [model] = useState(() => new WorkspaceModel(org, props.workspaceId))
  const [notices] = useState(() => new HeaderNotices())
  const detail = useStore(model.detail)
  const features = useFeatures()
  const viewport = useViewport()
  const theme = useSharedUiTheme()
  const go = useGo()
  const resume = useAction(() => model.resume(), "The sandbox didn't start.")
  // The notices follow the stream before `open` starts it, so that they
  // also read the stored history.
  useEffect(() => notices.follow(model.stream), [notices, model])
  useEffect(() => {
    void model.open()
    return () => model.close()
  }, [model])
  if (detail.state === 'loading') {
    return (
      <div className={workspaceStyles.center}>
        <Spinner
          accessibilityLabel="Opening the workspace"
          color={theme.colors.muted}
          size={14}
        />
      </div>
    )
  }
  if (detail.state === 'failed') {
    const missing = detail.error.status === 404
    return (
      <EmptyState
        action={
          <ActionButton
            onPress={() =>
              missing ? go(routes.org(props.org.id)) : void model.open()
            }
            tone="primary"
          >
            {missing ? 'All workspaces' : 'Try again'}
          </ActionButton>
        }
        body={
          missing ? 'It may have moved to another org.' : detail.error.message
        }
        icon={missing ? SearchX : CircleAlert}
        title={
          missing
            ? 'This workspace is not available'
            : "The workspace didn't open"
        }
      />
    )
  }
  const { workspace, start } = detail.value
  const sandbox = sandboxState(workspace)
  const context: WorkspaceContext = {
    org: props.org,
    workspace,
    viewer: props.viewer,
    sandbox,
    viewport,
    view: props.view,
    stream: model.stream,
    archive: mayArchive(props.org, workspace, props.viewer)
      ? () => void model.archive.start()
      : null,
  }
  const phone = viewport === 'phone'
  const problem = sandbox === 'ready' || sandbox === 'starting' ? null : sandbox
  const panel = (content: ReactNode) =>
    sandbox === 'ready' ? (
      content
    ) : (
      <SandboxPanel
        resume={phone ? resume : null}
        state={sandbox}
        workspace={workspace}
      />
    )
  const chat = features.center?.(context) ?? (
    <ChatColumn
      footer={
        problem ? (
          <SandboxBar problem={problem} resume={resume} workspace={workspace} />
        ) : (
          features.composer?.(context)
        )
      }
      phone={phone}
      starting={
        sandbox === 'starting' && start ? <StartingCard start={start} /> : null
      }
      transcript={features.transcript?.(context)}
    />
  )
  const header = (
    <WorkspaceHeader
      context={context}
      ownerControl={features.owner?.(context)}
    />
  )
  const dialog = <ArchiveDialog archive={model.archive} workspace={workspace} />
  if (phone) {
    const view = phoneView(props.view)
    const archived = sandbox === 'archived'
    const content = {
      chat: (
        <>
          {features.tabs?.(context)}
          {chat}
        </>
      ),
      files: panel(features.files?.(context)),
      tool: panel(features.tools?.(context)),
    }
    return (
      <div className={page.mobileBody}>
        {header}
        <HeaderNoticeBars notices={notices} />
        {features.pullRequest?.(context)}
        <div className={page.mobileBody}>
          {archived || view === 'chat'
            ? content.chat
            : view === 'files'
              ? content.files
              : content.tool}
        </div>
        {archived ? null : <PhoneTabBar context={context} />}
        {dialog}
      </div>
    )
  }
  return (
    <div className={body.body}>
      <div className={body.chat}>
        {header}
        <HeaderNoticeBars notices={notices} />
        {features.tabs?.(context)}
        {chat}
      </div>
      <RightColumn
        files={panel(features.files?.(context))}
        pullRequest={features.pullRequest?.(context)}
        tools={
          sandbox === 'archived' ? undefined : panel(features.tools?.(context))
        }
      />
      {dialog}
    </div>
  )
}
