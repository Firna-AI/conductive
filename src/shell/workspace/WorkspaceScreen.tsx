import { useCallback, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert, SearchX } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import body from '../../../docs/mockups/src/components/workspace/WorkspaceBody.module.css'
import page from '../../../docs/mockups/src/screens/WorkspaceScreen.module.css'
import { failedCreate } from '../../app/creations'
import { mayArchive } from '../../app/permissions'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import {
  useWorkspaceStore,
  type WorkspaceIdentity,
} from '../../app/workspace-store'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { useAction } from '../ui/useAction'
import { useViewport } from '../ui/viewport'
import { ArchiveDialog } from './ArchiveDialog'
import { ChatArea } from './ChatArea'
import { sandboxState, useFeatures, type WorkspaceContext } from './features'
import { HeaderNoticeBars } from './HeaderNoticeBars'
import {
  refusedStart,
  SandboxPanel,
  type SandboxNoticeState,
} from './SandboxNotice'
import { shownWorkspaces } from './shown-workspaces'
import { PhoneTabBar, phoneView, RightColumn } from './WorkspaceColumns'
import { WorkspaceHeader } from './WorkspaceHeader'
import type { WorkspaceView } from './workspace-view'
import workspaceStyles from './workspace.module.css'

/**
 * A workspace that the app cannot show: a 404, or a create whose sandbox did
 * not start, which the server removes. The way out is the list of the org.
 */
function Unavailable(props: { orgId: string; body: string }) {
  const go = useGo()
  return (
    <EmptyState
      action={
        <ActionButton
          onPress={() => go(routes.org(props.orgId))}
          tone="primary"
        >
          All workspaces
        </ActionButton>
      }
      body={props.body}
      icon={SearchX}
      title="This workspace is not available"
    />
  )
}

/** Shows the kept parts of the workspace while the screen shows it. */
function connectView(view: WorkspaceView): () => void {
  return view.connect()
}

/**
 * An open workspace. Desktop shows the chat column beside the right column;
 * a phone shows one view at a time, with five tabs to switch. The shell draws
 * the header, the start steps, and the states of the sandbox, and the chat
 * fills the centre. Later milestones fill the files, the tools, and the pull
 * request bar.
 *
 * The tab keeps the model, the header notices, and the chat of each
 * workspace that it showed. So a return draws the workspace at once, and
 * each stream asks only for the events after its own last event number.
 */
export function WorkspaceScreen(props: {
  org: OrgSummary
  workspaceId: string
  view: readonly string[]
  viewer: User
}) {
  const app = useApp()
  const create = useCallback(
    (workspace: WorkspaceIdentity) =>
      shownWorkspaces(app, props.viewer).view(workspace),
    [app, props.viewer],
  )
  const { store: shown, snapshot: detail } = useWorkspaceStore(
    { orgId: props.org.id, workspaceId: props.workspaceId },
    { create, connect: connectView },
  )
  const { model, notices, chat } = shown
  const startError = useStore(model.startError)
  const features = useFeatures()
  const viewport = useViewport()
  const theme = useSharedUiTheme()
  const resume = useAction(() => model.resume(), "The sandbox didn't start.")
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
    if (detail.error.status === 404) {
      return (
        <Unavailable
          body="It may have moved to another org."
          orgId={props.org.id}
        />
      )
    }
    return (
      <EmptyState
        action={
          <ActionButton onPress={() => void model.open()} tone="primary">
            Try again
          </ActionButton>
        }
        body={detail.error.message}
        icon={CircleAlert}
        title="The workspace didn't open"
      />
    )
  }
  // The server removes a create whose sandbox did not start: it has no
  // Resume, and no files stay. The tab that sent it shows its form instead.
  // Another tab shows the message that the start saved, when it has one.
  if (failedCreate(detail.value)) {
    const saved = detail.value.error?.message
    return (
      <Unavailable
        body={saved ? saved : "Its sandbox didn't start."}
        orgId={props.org.id}
      />
    )
  }
  const { workspace, start, error } = detail.value
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
    onReassigned: (updated) => model.reassigned(updated),
  }
  const phone = viewport === 'phone'
  // A refused start shows while the sandbox is down, until its cause ends.
  const refusal =
    sandbox === 'stopped' || sandbox === 'error'
      ? refusedStart(startError)
      : null
  // A failed start carries the message that the workspace saved for it.
  const notice: SandboxNoticeState | null =
    refusal ??
    (sandbox === 'error'
      ? { problem: 'error', message: error?.message ?? null }
      : sandbox === 'ready' || sandbox === 'starting'
        ? null
        : { problem: sandbox })
  const panel = (content: ReactNode) =>
    sandbox === 'ready' ? (
      content
    ) : (
      <SandboxPanel
        resume={phone ? resume : null}
        state={refusal ? 'refused' : sandbox}
        workspace={workspace}
      />
    )
  const chatArea = (
    <ChatArea
      chat={chat}
      context={context}
      notice={notice}
      resume={resume}
      start={start}
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
      chat: chatArea,
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
        {chatArea}
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
