import type { ApiClient } from '../../app/api/client'
import type { Delay } from '../../app/events'
import { createChatApi, type WorkspaceTarget } from '../api/client'
import type { StreamEnvelope } from '../api/read-workspace'
import { DeviceReads, refreshDevices } from '../device/device-actions'
import { createDeviceApi } from '../device/device-api'
import { SessionReads } from '../links/session-reads'
import {
  browserTimers,
  WorkspaceStream,
  type StreamTimers,
  type SubscribeToWorkspace,
} from '../stream/workspace-stream'
import type { ChatStore } from './chat-snapshot'
import { applyEnvelopes } from './apply-events'
import { isArchived, reloadView } from './archive-view'
import { viewWriter, type ChatContext } from './context'
import type { ChatSources } from './sources'

export interface ChatContextOptions {
  target: WorkspaceTarget
  /** The JSON client of the app, over the Worker or the fake API. */
  client: ApiClient
  /** Opens the workspace event stream: the app's socket, or the fake's events. */
  subscribe: SubscribeToWorkspace
  timers?: StreamTimers
  newId?: () => string
  /**
   * The inputs that app models own, as `ChatSources` says. Without them,
   * the chat reads the account, the org, the models, the members, and the
   * workspace list itself.
   */
  sources?: ChatSources
}

/** A delay over the timers of the chat, so the waits of uploads use them too. */
function timerDelay(timers: StreamTimers): Delay {
  return (ms, run) => {
    // A cancelled wait never runs, also when its timer is already due.
    let live = true
    const handle = timers.set(() => {
      if (live) void run()
    }, ms)
    return () => {
      live = false
      timers.clear(handle)
    }
  }
}

/** The Worker records a change of the workspace with each change of a Mac command. */
const changesWorkspace = (envelopes: readonly StreamEnvelope[]) =>
  envelopes.some(({ event }) => event?.type === 'workspace.updated')

/** Builds the data and stream of one controller run. */
export function createChatContext(
  options: ChatContextOptions,
  store: ChatStore,
  live: () => boolean,
  draftEpoch: number,
): ChatContext {
  const { target, subscribe, timers } = options
  const api = createChatApi(options.client, target)
  let drafts = 0
  let files = 0
  const context: ChatContext = {
    target,
    api,
    store,
    loading: new Map(),
    edits: new Map(),
    workspaceOrder: { through: 0 },
    picks: new Map(),
    moves: new Map(),
    newId: options.newId ?? (() => crypto.randomUUID()),
    prompts: new Map(),
    newDraftId: () => {
      drafts += 1
      return `draft:new:${draftEpoch}:${drafts}`
    },
    newFileId: () => {
      files += 1
      return `file-${files}`
    },
    uploads: new Map(),
    delay: timerDelay(timers ?? browserTimers),
    saveView: viewWriter((view) => api.saveView(view)),
    live,
    owned: options.sources !== undefined,
    devices: {
      api: createDeviceApi(options.client),
      reads: new DeviceReads(),
    },
    sessionReads: new SessionReads((workspaceId) =>
      createChatApi(options.client, { ...target, workspaceId }).sessions(),
    ),
    tabChoices: { count: 0 },
    stream: new WorkspaceStream({
      target,
      subscribe,
      timers,
      deliver: (envelopes) => {
        if (!live()) return
        const archived = isArchived(store.get())
        applyEnvelopes(context, envelopes)
        if (archived && !isArchived(store.get())) void reloadView(context)
        if (changesWorkspace(envelopes)) void refreshDevices(context)
      },
    }),
  }
  return context
}
