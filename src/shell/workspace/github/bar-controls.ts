import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react'
import { useNavigation } from '../../../app/navigation'
import { routes } from '../../../app/router'
import { anyTurnRuns } from '../../../chat/state/chat-snapshot'
import type { BarActions } from '../../../github/barActions'
import type { BarActionsPorts } from '../../../github/barPorts'
import { localWorkOf, type BarControls } from '../../../github/barView'
import { createContinueActions } from '../../../github/continueActions'
import { createGitHubActions } from '../../../github/githubActions'
import type { WorkspaceTarget } from '../../../github/githubClient'
import type { GitHubFeed } from '../../../github/githubStore'
import { useBarActions, useBarControls } from '../../../github/useBarControls'
import type { GitHubSubscription } from '../../../github/useGitHubState'
import { useOrgModel } from '../../context'
import type { WorkspaceContext } from '../features'
import { useKeptFiles } from '../files/workspace-files'
import type { WorkspaceQueue } from './workspace-queue'

/**
 * The one action store of the bar of the open workspace, over the services
 * of the org, the kept chat, and the ordered stream of the workspace. The
 * kept parts change with the member, so a new member gets a new store, and
 * so does a new branch, such as after a Continue of another member.
 */
export function useScreenActions(
  context: WorkspaceContext,
  github: GitHubSubscription,
): BarActions {
  const model = useOrgModel(context.org.id)
  const { services } = model
  const { org, workspace, stream, chat } = context
  const { states, retry } = github
  const { branch, repositoryId } = workspace
  const ports = useCallback(
    (target: WorkspaceTarget): BarActionsPorts => ({
      branch,
      github: createGitHubActions(services.api.fetch, target),
      continues: createContinueActions(services.api, target),
      sendPrompt: chat.sendPrompt,
      delay: services.delay,
      githubState: states,
      refreshGitHub: retry,
      streamLast: stream.last,
      reconnects: stream.reconnects,
      access: model.githubAccessOf(repositoryId),
    }),
    [branch, repositoryId, services, model, chat, stream, states, retry],
  )
  return useBarActions({ orgId: org.id, workspaceId: workspace.id }, ports)
}

/**
 * Shows the chat when a prompt did not go out, so the composer names the
 * cause, such as a missing login or a failed send: the chat of the open
 * session in place of a file on desktop, and the chat tab on a phone.
 * Without an open session, the chat shows, where the member can start
 * one. The callers use only a result from the connection of the press.
 */
export function useShowChat(context: WorkspaceContext): () => void {
  const { chat, org, workspace, viewport } = context
  const navigation = useNavigation()
  return useCallback(() => {
    const sessionId = chat.getSnapshot().activeSessionId
    if (viewport !== 'phone' && sessionId) {
      void chat.select(sessionId)
      return
    }
    navigation.push(routes.workspace(org.id, workspace.id))
  }, [viewport, navigation, org.id, workspace.id, chat])
}

/**
 * The bar actions of the open workspace: the local work of the kept files,
 * which the screen connects, and the turns of every session of the kept
 * chat. An agent action that did not send shows the chat of its session,
 * where the composer names the cause, such as a missing login or a failed
 * send: the chat in place of a file on desktop, and the chat tab on a
 * phone. Without an open session, the chat shows, where the member can
 * start one. A sent prompt keeps the view. A result after the connection
 * of the press ends also keeps the view and selects no session. `queue`
 * gives the merge queue of the workspace, from the list of the org.
 */
export function useScreenControls(
  context: WorkspaceContext,
  github: GitHubFeed,
  actions: BarActions,
  queue: WorkspaceQueue,
): BarControls | null {
  const files = useKeptFiles(context)
  const localWork = useSyncExternalStore(files.subscribe, () =>
    localWorkOf(files.getSnapshot().changes),
  )
  const { chat } = context
  const turnRuns = useSyncExternalStore(chat.subscribe, () =>
    anyTurnRuns(chat.getSnapshot()),
  )
  const showChat = useShowChat(context)
  // The presses run the writes of the latest render, so the controls
  // change only with the facts of the queue.
  const latest = useRef(queue)
  useEffect(() => {
    latest.current = queue
  })
  const { input } = queue
  const queueScreen = useMemo(
    () => ({
      input,
      add: () => latest.current.add(),
      remove: () => latest.current.remove(),
    }),
    [input],
  )
  return useBarControls({
    github,
    actions,
    localWork,
    turnRuns,
    readOnly: context.readOnly,
    archive: context.archive,
    archiving: context.running === 'archive',
    showChat,
    queue: queueScreen,
  })
}
