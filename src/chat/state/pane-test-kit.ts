import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { WorkspaceView } from '../../shared/workspace-view'
import { workspaceViewPath } from '../../shared/workspace-view'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { tabChat } from './tab-order-test-kit'
import { chatFor } from './test-kit'

export const leftSession = {
  kind: 'session',
  sessionId: FAKE_IDS.session,
} as const
export const rightSession = { kind: 'session', sessionId: 'debounce' } as const
export const leftFile = {
  kind: 'file',
  path: 'left.ts',
  mode: 'source',
} as const
export const rightFile = { kind: 'diff', path: 'right.ts' } as const
export const splitView = {
  panes: [
    {
      tabs: [leftSession, leftFile],
      activeTab: leftSession,
      temporaryTab: { kind: 'file', path: leftFile.path },
    },
    {
      tabs: [rightSession, rightFile],
      activeTab: rightSession,
      temporaryTab: { kind: 'diff', path: rightFile.path },
    },
  ],
  focusedPane: 0,
  fileList: 'all',
  tool: 'terminal',
} satisfies WorkspaceView

export const codex: AgentChoice = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'medium',
  fast: false,
}

export function setSplitView(
  chat: ReturnType<typeof chatFor>,
  view: WorkspaceView = splitView,
): void {
  chat.server.json('GET', workspaceViewPath(FAKE_IDS.org, FAKE_IDS.workspace), {
    view,
  })
}

export function paneChat(options: Parameters<typeof chatFor>[0] = {}) {
  const chat = tabChat([], { conversation: 'history', ...options })
  setSplitView(chat)
  return chat
}

export function showFiles(chat: ReturnType<typeof chatFor>): void {
  chat.controller.updateView((view) => ({
    ...view,
    panes: [
      { ...view.panes[0], activeTab: leftFile },
      { ...splitView.panes[1], ...view.panes[1], activeTab: rightFile },
    ],
  }))
}
