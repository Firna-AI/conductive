import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { createApiClient } from '../../app/api/client'
import { WorkspaceStream } from '../../app/events'
import { anyTurnRuns } from '../../chat/state/chat-snapshot'
import { ChatController } from '../../chat/state/controller'
import { createFilesClient } from '../../files/api/files-client'
import { WorkspaceFiles } from '../../files/model/files-store'
import type { BarControls } from '../barView'
import { localWorkOf } from '../barView'
import { createContinueActions } from '../continueActions'
import { createGitHubActions } from '../githubActions'
import type { WorkspaceTarget } from '../githubClient'
import { useBarActions, useBarControls } from '../useBarControls'
import type { GitHubSubscription } from '../useGitHubState'
import type { BarActions } from '../barActions'
import type { DevSource } from './devSource'

/**
 * The chat, the files, and the stream that the bar reads beside GitHub,
 * over the fake API of the page, with the real stores of the app.
 */
function devParts(source: DevSource, target: WorkspaceTarget) {
  const { server, fetch } = source
  return {
    chat: new ChatController({
      target,
      client: createApiClient(fetch),
      subscribe: (_target, after, listener) =>
        server.events.subscribe(after, (message) => listener.message(message)),
    }),
    files: new WorkspaceFiles({
      client: createFilesClient({ fetch, ...target }),
      subscribe: (after, listener) => server.events.subscribe(after, listener),
    }),
    stream: new WorkspaceStream(
      {
        open: (stream, handlers) =>
          server.events.subscribe(stream.afterEventNumber, handlers.message),
      },
      target,
      source.delay,
    ),
  }
}

/**
 * The real action state of the bar on the development page: the action
 * clients over the fake API, the prompt send of a real chat, the local
 * work of a real files store, and the turns of that chat.
 */
export function useDevBar(props: {
  source: DevSource
  target: WorkspaceTarget
  github: GitHubSubscription
  /** The branch of the fixtures, until the bar shows a branch. */
  branch: string
  archive: (() => void) | null
  showChat: () => void
}): {
  controls: BarControls | null
  actions: BarActions
  chat: ChatController
} {
  const { source, target, github } = props
  const parts = useMemo(() => devParts(source, target), [source, target])
  useEffect(() => {
    void parts.chat.start()
    parts.files.start()
    parts.stream.start()
    return () => {
      parts.chat.stop()
      parts.files.stop()
      parts.stream.stop()
    }
  }, [parts])
  const { states, retry, state } = github
  // The page has no workspace record, so the bar's own branch keys Continue.
  const branch =
    state.status === 'ready' ? state.snapshot.banner.branch : props.branch
  const ports = useCallback(
    (workspace: WorkspaceTarget) => ({
      branch,
      github: createGitHubActions(source.fetch, workspace),
      continues: createContinueActions(
        createApiClient(source.fetch),
        workspace,
      ),
      sendPrompt: parts.chat.sendPrompt,
      delay: source.delay,
      githubState: states,
      refreshGitHub: retry,
      streamLast: parts.stream.last,
      reconnects: parts.stream.reconnects,
    }),
    [branch, source, parts, states, retry],
  )
  const actions = useBarActions(target, ports)
  const localWork = useSyncExternalStore(parts.files.subscribe, () =>
    localWorkOf(parts.files.getSnapshot().changes),
  )
  const turnRuns = useSyncExternalStore(parts.chat.subscribe, () =>
    anyTurnRuns(parts.chat.getSnapshot()),
  )
  const controls = useBarControls({
    github,
    actions,
    localWork,
    turnRuns,
    readOnly: false,
    archive: props.archive,
    archiving: false,
    showChat: props.showChat,
  })
  return { controls, actions, chat: parts.chat }
}
