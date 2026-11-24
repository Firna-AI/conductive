import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { WorkspaceStart } from '../../shared/generated/WorkspaceStart'
import {
  replacesComposer,
  type SandboxNoticeState,
} from '../../ui/components/workspace/sandboxNoticeState'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import type { ComposerFocus } from '../../chat/components/composer-requests'
import type { ChatHost } from '../../chat/components/session-parts'
import type { ChatController } from '../../chat/state/controller'
import type { RenderTab } from '../../chat/components/tab-row'
import { WorkspaceChatView } from '../../chat/WorkspaceChat'
import { useStartFailedNotice } from '../capabilities/StartFailedNotice'
import {
  usePreloadedCapabilities,
  workspaceCapabilities,
} from '../capabilities/WorkspaceCapabilities'
import { useApp } from '../context'
import { useGo } from '../ui/AppLink'
import type { Action } from '../ui/useAction'
import { useFeatures, type WorkspaceContext } from './features'
import { useChatFiles } from './files/chat-files'
import { useGitHubFeed } from './github/WorkspaceGitHub'
import {
  KeptPageFrames,
  PageFrames,
  PageFramesContext,
} from './previews/page-frames'
import { usePreviewCentre } from './previews/preview-centre'
import { filesCenter } from './files/files-features'
import { useSkillCentre } from './skills/skill-centre'
import { SandboxBar } from './SandboxNotice'
import { StartingCard } from './StartingCard'
import { ChatColumn } from './WorkspaceColumns'

/**
 * The focus request of the app for the composer of `workspaceId`, until the
 * composer takes it. A phone opens no keyboard on its own.
 */
function useComposerFocus(
  workspaceId: string,
  phone: boolean,
): ComposerFocus | null {
  const store = useApp().composerFocus
  const request = useStore(store)
  const done = useCallback(
    () => store.change((current) => (current === request ? null : current)),
    [store, request],
  )
  return useMemo(
    () =>
      request && request.workspaceId === workspaceId && !phone
        ? { request, done }
        : null,
    [request, done, workspaceId, phone],
  )
}

/**
 * The kept chat of the workspace, with the parts that the shell draws, and
 * the open files, Preview, and skill tabs: their tabs at their places in
 * the tab row, and `content`, a file or diff tab in place of the chat of
 * the session. A Preview or skill tab that the address shows takes that
 * place too, and the pages of the Preview tabs stay loaded under it. On
 * desktop, so do the pages of the tabs of HTML files. It pre-loads the
 * Capabilities of the workspace, so their control opens at once.
 */
function KeptChat(props: {
  context: WorkspaceContext
  chat: ChatController
  host: ChatHost
  content: ReactNode
}) {
  const { context } = props
  const services = useServices()
  const go = useGo()
  const clock = useMemo(() => ({ now: services.now }), [services])
  const previews = usePreviewCentre(context)
  const skills = useSkillCentre(context)
  const content = props.content ?? previews.content ?? skills.content
  const files = useChatFiles(context, content)
  const fileTab = files.renderTab
  const renderTab: RenderTab | undefined = fileTab
    ? (tab) => {
        if (tab.kind === 'preview') return previews.renderTab(tab)
        if (tab.kind === 'skill') return skills.renderTab(tab)
        return fileTab(tab)
      }
    : undefined
  const phone = context.viewport === 'phone'
  const focus = useComposerFocus(context.workspace.id, phone)
  usePreloadedCapabilities(context.org.id, context.workspace.id)
  const [frames] = useState(() => new PageFrames())
  const keeps = !phone && context.sandbox !== 'archived'
  return (
    <PageFramesContext value={keeps ? frames : null}>
      <WorkspaceChatView
        clock={clock}
        composerFocus={focus}
        content={content}
        kept={
          <>
            {previews.kept}
            {keeps ? (
              <KeptPageFrames context={context} frames={frames} />
            ) : null}
          </>
        }
        controller={props.chat}
        copy={services}
        host={props.host}
        mentions={files.mentions}
        onConnectAgent={(agent) => go(routes.account(agent))}
        onOpenDiff={files.onOpenDiff}
        onOpenPage={go}
        readOnly={context.readOnly}
        renderTab={renderTab}
        viewport={phone ? 'mobile' : 'desktop'}
      />
    </PageFramesContext>
  )
}

/**
 * The chat area of the open workspace: the session tabs, the chat, and its
 * composer. The shell draws the start steps at the end of the chat and the
 * bar of a sandbox that is down, from its own record of the workspace, and
 * the chat places them. `notice` is that bar's state: a start that the app
 * refused, with its reason, such as in a suspended org, or a start that
 * failed, with the message that the workspace saved for it. The bar takes
 * the place of the composer, except after a failed first start, whose
 * composer stays under it. `orgNotice` is
 * the notice of a suspended org above the bar of an archived workspace. A
 * read-only workspace shows its chat read-only. The chat shows the open
 * file tabs, and on desktop the file or diff tab of the address in place of
 * the chat of its session. The composer of the chat gets the Capabilities
 * tool of the workspace. The Mac app shows a notice over the composer
 * if a grant of this Mac did not start after the create.
 * A host that gives the `tabs`, `transcript`, or `composer` slot gets the
 * shell's own column with those slots. A `center` part of the host takes
 * the place of the chat. The chat gets the GitHub state of the workspace
 * branch while it shows, so the New session text can use its label.
 */
export function ChatArea(props: {
  context: WorkspaceContext
  chat: ChatController
  start: WorkspaceStart | null
  notice: SandboxNoticeState | null
  orgNotice: ReactNode | null
  resume: Action<[]>
}) {
  const features = useFeatures()
  const { context, notice } = props
  const { sandbox, workspace } = context
  const phone = context.viewport === 'phone'
  const startNotice = useStartFailedNotice(workspace.id)
  const github = useGitHubFeed()?.state
  const banner = github?.status === 'ready' ? github.snapshot.banner : null
  const starting =
    sandbox === 'starting' && props.start ? (
      <StartingCard start={props.start} />
    ) : null
  const sandboxBar = notice ? (
    <>
      {props.orgNotice}
      <SandboxBar
        notice={notice}
        restore={
          context.restore
            ? { run: context.restore, pending: context.running === 'restore' }
            : null
        }
        resume={props.resume}
        workspace={workspace}
      />
    </>
  ) : null
  const keepsComposer = notice !== null && !replacesComposer(notice)
  const center = features.center?.(context) ?? null
  if (features.tabs || features.transcript || features.composer) {
    const composer = features.composer?.(context)
    return (
      <>
        {features.tabs?.(context)}
        {center ?? (
          <ChatColumn
            footer={
              keepsComposer ? (
                <>
                  {sandboxBar}
                  {composer}
                </>
              ) : (
                (sandboxBar ?? composer)
              )
            }
            phone={phone}
            starting={starting}
            transcript={features.transcript?.(context)}
          />
        )}
      </>
    )
  }
  return (
    center ?? (
      <KeptChat
        chat={props.chat}
        content={features.center ? null : filesCenter(context)}
        context={context}
        host={{
          starting,
          sandboxBar,
          keepsComposer,
          notice: startNotice,
          github: banner,
          tools: [
            workspaceCapabilities({
              org: context.org,
              workspaceId: workspace.id,
              viewer: context.viewer,
              chat: props.chat,
            }),
          ],
        }}
      />
    )
  )
}
