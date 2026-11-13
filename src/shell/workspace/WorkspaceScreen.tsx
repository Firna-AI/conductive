import { useCallback, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import { SuspendedOrgNotice } from '../../../docs/mockups/src/components/orgs/SuspendedOrgNotice'
import body from '../../../docs/mockups/src/components/workspace/WorkspaceBody.module.css'
import page from '../../../docs/mockups/src/screens/WorkspaceScreen.module.css'
import { usePassedDeadlines } from '../../app/deadlines'
import { mayArchive, mayRestore } from '../../app/permissions'
import { useStore } from '../../app/store'
import {
  useWorkspaceStore,
  type WorkspaceIdentity,
} from '../../app/workspace-store'
import { failedFirstStart } from '../../app/first-start'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOrgAccess } from '../context'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { useViewport } from '../ui/viewport'
import { ChatArea } from './ChatArea'
import { ContinueDialog } from './ContinueDialog'
import { sandboxState, useFeatures, type WorkspaceContext } from './features'
import { KeptFilesConnection } from './files/kept-files'
import { ResumeOnTabOpen } from './files/tab-open-resume'
import { WorkspaceGitHub } from './github/WorkspaceGitHub'
import { HeaderNoticeBars } from './HeaderNoticeBars'
import { archivedRestore, contentState, sandboxView } from './sandbox-view'
import { SandboxPanel } from './SandboxNotice'
import { MissingWorkspace, useRememberWorkspace } from './remember-workspace'
import { OpenSessionAddress } from './session-address'
import { shownWorkspaces } from './tab-memory'
import { ToolsPart } from './tools/ToolsPart'
import { useArchiveActions } from './useArchiveActions'
import { PhoneTabBar, phoneView, RightColumn } from './WorkspaceColumns'
import { WorkspaceHeader } from './WorkspaceHeader'
import { WorkspaceMacBar } from './WorkspaceMacBar'
import { WorkspacePaletteActions } from './WorkspacePaletteActions'
import type { WorkspaceView } from './workspace-view'
import workspaceStyles from './workspace.module.css'

/** Shows the kept parts of the workspace while the screen shows it. */
function connectView(view: WorkspaceView): () => void {
  return view.connect()
}

/**
 * An open workspace. On desktop the chat column sits beside the right column.
 * A phone shows one view at a time, with tabs to switch. The shell draws
 * the header, the start steps, and the states of the sandbox, and the chat
 * fills the centre. The app's own parts fill the files, the tools, the pull
 * request bar, and the owner picker, unless the host gives its own.
 *
 * The tab keeps the model, the header notices, the chat, and the tool
 * events of each workspace that it showed. So a return draws the workspace
 * at once, and each stream asks only for the events after its own last
 * event number.
 *
 * In a suspended org the history stays, and the refused bar of the org
 * takes the place of the composer, also while the stop of its cloud
 * computer runs. An archived workspace keeps its bar, with the notice of
 * the org above it.
 */
export function WorkspaceScreen(props: {
  org: OrgSummary
  workspaceId: string
  view: readonly string[]
  /** The session that the address names, which the chat then shows. */
  session?: string
  viewer: User
}) {
  const app = useApp()
  const access = useOrgAccess(props.org)
  const create = useCallback(
    (workspace: WorkspaceIdentity) =>
      shownWorkspaces(app, props.viewer).view(workspace),
    [app, props.viewer],
  )
  const { store: shown, snapshot: detail } = useWorkspaceStore(
    { orgId: props.org.id, workspaceId: props.workspaceId },
    { create, connect: connectView },
  )
  const { model, notices, chat, toolEvents, skills } = shown
  const startError = useStore(model.startError)
  const opened = useStore(model.opened)
  const features = useFeatures()
  const viewport = useViewport()
  const theme = useSharedUiTheme()
  const resume = useAction(() => model.resume(), "The sandbox didn't start.")
  const lifecycle = useArchiveActions(props.org.id, props.viewer)
  useRememberWorkspace(
    {
      orgId: props.org.id,
      workspaceId: props.workspaceId,
      view: props.view,
      session: props.session,
    },
    detail,
  )
  // Restore ends at its last day while the page shows, with no other event.
  const passed = usePassedDeadlines([
    detail.state === 'ready' ? detail.value.workspace.restoreUntil : null,
  ])
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
        <MissingWorkspace
          orgId={props.org.id}
          workspaceId={props.workspaceId}
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
  const { workspace, start, error } = detail.value
  const sandbox = sandboxState(workspace)
  const { suspended } = access
  const restoreEnded = passed(workspace.restoreUntil)
  // A failed first start keeps the workspace, its chat, and its queue for
  // every member, with its saved cause and Try again. The open resumes a
  // stopped sandbox, so its bar waits until the open ends.
  const sandboxParts = sandboxView({
    sandbox,
    suspended,
    startError,
    savedError: error?.message ?? null,
    firstStart: failedFirstStart(workspace, start),
    restore: archivedRestore(workspace, suspended, restoreEnded),
    opened,
  })
  const context: WorkspaceContext = {
    org: props.org,
    workspace,
    viewer: props.viewer,
    sandbox,
    readOnly: suspended || sandbox === 'archived',
    panel: sandboxParts.panel,
    resumingAtOpen: sandboxParts.resumingAtOpen,
    resume,
    viewport,
    view: props.view,
    stream: model.stream,
    savedView: chat,
    chat,
    toolEvents: toolEvents.subscribe,
    skills,
    archive: mayArchive(access, workspace, props.viewer)
      ? () => lifecycle.archive(workspace)
      : null,
    restore: mayRestore(access, workspace, restoreEnded)
      ? () => lifecycle.restore(workspace)
      : null,
    running: lifecycle.running(workspace.id),
    onReassigned: (updated) => model.reassigned(updated),
  }
  const phone = viewport === 'phone'
  // The state of a sandbox that does not run, in place of a part: the
  // notice of the bar, with the words of a refusal, or the wait of a start,
  // also while the open resumes the sandbox.
  const shownState = contentState(
    sandboxParts.panel,
    sandboxParts.resumingAtOpen,
  )
  const down =
    shownState === null ? null : (
      <SandboxPanel
        phone={phone}
        resume={resume}
        state={shownState}
        workspace={workspace}
      />
    )
  const panel = (content: ReactNode) => down ?? content
  // The shell's own tools keep their tabs on desktop around the state of a
  // sandbox that does not run, and mount no tool then. A tools part of the
  // host shows the state in its place.
  const tools = features.tools ? (
    panel(features.tools(context))
  ) : (
    <ToolsPart context={context} placeholder={down} />
  )
  // The Files part keeps the lists of a stopped sandbox, from the copy that
  // the workspace keeps. It shows a start, a refusal, or a failed first
  // start in their place. An archived workspace has no lists.
  const files = sandbox === 'archived' ? panel(null) : features.files?.(context)
  const chatArea = (
    <ChatArea
      chat={chat}
      context={context}
      notice={sandboxParts.bar}
      orgNotice={
        sandboxParts.orgNotice ? <SuspendedOrgNotice org={props.org} /> : null
      }
      resume={resume}
      start={sandboxParts.refusal ? null : start}
    />
  )
  const header = (
    <WorkspaceHeader
      context={context}
      ownerControl={features.owner?.(context)}
    />
  )
  // Continue, palette actions, file tab resume, and the session address.
  const dialog = (
    <>
      <ContinueDialog />
      <WorkspacePaletteActions chat={chat} context={context} />
      <ResumeOnTabOpen context={context} />
      <OpenSessionAddress
        chat={chat}
        context={context}
        session={props.session}
      />
    </>
  )
  if (phone) {
    const view = phoneView(props.view)
    const archived = sandbox === 'archived'
    const content = {
      chat: chatArea,
      files,
      tool: tools,
    }
    const screen = (
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
    // An archived workspace on a phone shows only its chat: no pull request
    // row and no Checks, so it reads no GitHub state and no files.
    if (archived) return screen
    return (
      <KeptFilesConnection context={context}>
        <WorkspaceGitHub context={context}>{screen}</WorkspaceGitHub>
      </KeptFilesConnection>
    )
  }
  // The bar of the Mac app tops the main area, above the whole workspace.
  return (
    <KeptFilesConnection context={context}>
      <WorkspaceGitHub context={context}>
        <WorkspaceMacBar context={context} />
        <div className={body.body}>
          <div className={body.chat}>
            {header}
            <HeaderNoticeBars notices={notices} />
            {chatArea}
          </div>
          <RightColumn
            files={files}
            pullRequest={features.pullRequest?.(context)}
            tools={sandbox === 'archived' ? undefined : tools}
          />
          {dialog}
        </div>
      </WorkspaceGitHub>
    </KeptFilesConnection>
  )
}
