import { useCallback, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert, SearchX } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import { SuspendedOrgNotice } from '../../../docs/mockups/src/components/orgs/SuspendedOrgNotice'
import body from '../../../docs/mockups/src/components/workspace/WorkspaceBody.module.css'
import page from '../../../docs/mockups/src/screens/WorkspaceScreen.module.css'
import { mayArchive } from '../../app/permissions'
import { routes } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import {
  useWorkspaceStore,
  type WorkspaceIdentity,
} from '../../app/workspace-store'
import { failedFirstStart } from '../../app/first-start'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOrgAccess, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { useAction } from '../ui/useAction'
import { useViewport } from '../ui/viewport'
import { ArchiveDialog } from './ArchiveDialog'
import { ChatArea } from './ChatArea'
import { ContinueDialog } from './ContinueDialog'
import { sandboxState, useFeatures, type WorkspaceContext } from './features'
import { KeptFilesConnection } from './files/kept-files'
import { ResumeOnTabOpen } from './files/tab-open-resume'
import { WorkspaceGitHub } from './github/WorkspaceGitHub'
import { HeaderNoticeBars } from './HeaderNoticeBars'
import { sandboxView } from './sandbox-view'
import { SandboxPanel } from './SandboxNotice'
import { shownWorkspaces } from './tab-memory'
import { ToolsPart } from './tools/ToolsPart'
import { PhoneTabBar, phoneView, RightColumn } from './WorkspaceColumns'
import { WorkspaceHeader } from './WorkspaceHeader'
import { WorkspaceMacBar } from './WorkspaceMacBar'
import { WorkspacePaletteActions } from './WorkspacePaletteActions'
import type { WorkspaceView } from './workspace-view'
import workspaceStyles from './workspace.module.css'

/**
 * A workspace that the app cannot show, such as after a 404. The way out is
 * the list of the org.
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
  const { model, notices, chat, toolEvents } = shown
  const startError = useStore(model.startError)
  const listed = valueOf(useStore(useOrgModel(props.org.id).workspaces))?.find(
    (item) => item.id === props.workspaceId,
  )
  const features = useFeatures()
  const viewport = useViewport()
  const theme = useSharedUiTheme()
  const resume = useAction(() => model.resume(), "The sandbox didn't start.")
  // The Archive question keeps one place in each state of the screen. So a
  // question that the row of the workspace started during the first read,
  // with the name of the list, shows once and stays when the read ends.
  const named = detail.state === 'ready' ? detail.value.workspace : listed
  const withQuestion = (content: ReactNode) => (
    <>
      {content}
      {named ? (
        <ArchiveDialog archive={model.archive} workspace={named} />
      ) : null}
    </>
  )
  if (detail.state === 'loading') {
    return withQuestion(
      <div className={workspaceStyles.center}>
        <Spinner
          accessibilityLabel="Opening the workspace"
          color={theme.colors.muted}
          size={14}
        />
      </div>,
    )
  }
  if (detail.state === 'failed') {
    if (detail.error.status === 404) {
      return withQuestion(
        <Unavailable
          body="It may have moved to another org."
          orgId={props.org.id}
        />,
      )
    }
    return withQuestion(
      <EmptyState
        action={
          <ActionButton onPress={() => void model.open()} tone="primary">
            Try again
          </ActionButton>
        }
        body={detail.error.message}
        icon={CircleAlert}
        title="The workspace didn't open"
      />,
    )
  }
  const { workspace, start, error } = detail.value
  const sandbox = sandboxState(workspace)
  const { suspended } = access
  // A failed first start keeps the workspace, its chat, and its queue for
  // every member, with its saved cause and Try again.
  const sandboxParts = sandboxView({
    sandbox,
    suspended,
    startError,
    savedError: error?.message ?? null,
    firstStart: failedFirstStart(workspace, start),
  })
  const context: WorkspaceContext = {
    org: props.org,
    workspace,
    viewer: props.viewer,
    sandbox,
    readOnly: suspended || sandbox === 'archived',
    panel: sandboxParts.panel,
    resume,
    viewport,
    view: props.view,
    stream: model.stream,
    savedView: chat,
    chat,
    toolEvents: toolEvents.subscribe,
    archive: mayArchive(access, workspace, props.viewer)
      ? () => void model.archive.start()
      : null,
    onReassigned: (updated) => model.reassigned(updated),
  }
  const phone = viewport === 'phone'
  // The state of a sandbox that does not run, in place of a part: the
  // notice of the bar, with the words of a refusal, or the wait of a start.
  const down =
    sandboxParts.panel === null ? null : (
      <SandboxPanel
        phone={phone}
        resume={resume}
        state={sandboxParts.panel}
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
  // The question of Continue, the actions of the screen for the palette, and
  // the resume of a stopped sandbox when a file or diff tab opens. Each
  // layout draws them. The Archive question has its own place, as
  // `withQuestion` says.
  const dialog = (
    <>
      <ContinueDialog />
      <WorkspacePaletteActions chat={chat} context={context} />
      <ResumeOnTabOpen context={context} />
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
    if (archived) return withQuestion(screen)
    return withQuestion(
      <KeptFilesConnection context={context}>
        <WorkspaceGitHub context={context}>{screen}</WorkspaceGitHub>
      </KeptFilesConnection>,
    )
  }
  // The bar of the Mac app tops the main area, above the whole workspace.
  return withQuestion(
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
    </KeptFilesConnection>,
  )
}
