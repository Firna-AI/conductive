import { defaultChoice } from '../../../docs/mockups/src/fixtures/agents'
import {
  closedSessions,
  workspaceSessions,
} from '../../../docs/mockups/src/fixtures/sessions'
import { workspaceList } from '../../../docs/mockups/src/fixtures/workspaces'
import type { UserMessage } from '../../shared/messages'
import type { SessionsResponse } from '../../shared/sessions'
import type { WorkspaceViewResponse } from '../../shared/workspace-view'
import type {
  CreateWorkspaceResponse,
  Workspace,
  WorkspaceResponse,
  WorkspaceState,
  WorkspacesResponse,
} from '../../shared/workspaces'
import { FAKE_IDS, FAKE_TIME, fakeUser, fakeUsers } from './core'

export function workspaceFixtures(state: WorkspaceState = 'ready') {
  const workspaces: WorkspacesResponse = {
    workspaces: workspaceList.map((workspace, index) => ({
      id: workspace.key,
      orgId: FAKE_IDS.org,
      repositoryId: workspace.repository,
      sectionId: workspace.section,
      owner: fakeUsers.find((user) => user.id === workspace.owner) ?? fakeUser,
      name: workspace.name,
      branch: workspace.branch,
      choice: workspace.choice,
      state: workspace.key === FAKE_IDS.workspace ? state : workspace.status,
      createdAt: FAKE_TIME - (index + 1) * 86_400_000,
      updatedAt: FAKE_TIME - index * 60_000,
      archivedAt:
        workspace.key === FAKE_IDS.workspace && state === 'archived'
          ? FAKE_TIME
          : null,
    })),
  }
  const workspace = workspaces.workspaces.find(
    (item) => item.id === FAKE_IDS.workspace,
  )
  if (!workspace) throw new Error('The workspace fixture is missing.')
  const detail: WorkspaceResponse = {
    workspace,
    start:
      state === 'starting'
        ? {
            kind: 'resume',
            startedAt: FAKE_TIME - 3_000,
            steps: [
              {
                id: 'restore',
                label: 'Resuming with your files as you left them',
                state: 'running',
                startedAt: FAKE_TIME - 3_000,
                completedAt: null,
              },
            ],
          }
        : null,
    error:
      state === 'error'
        ? {
            code: 'start_failed',
            message: 'The cloud computer did not start. Try again.',
            log: null,
          }
        : null,
  }
  const sessions: SessionsResponse = {
    sessions: workspaceSessions.map((session, index) => ({
      id: session.key,
      workspaceId: workspace.id,
      title: session.title,
      choice: defaultChoice,
      createdAt: FAKE_TIME - (index + 1) * 60_000,
      closedAt: null,
      activeTurnId: state === 'working' ? 'turn-1' : null,
      retryMessageId: null,
    })),
    history: closedSessions.map((session, index) => ({
      id: session.key,
      workspaceId: workspace.id,
      title: session.title,
      choice:
        session.agent === 'codex'
          ? { agent: 'codex', model: 'GPT-6.1 Sol', effort: 'medium' }
          : defaultChoice,
      createdAt: FAKE_TIME - (index + 2) * 86_400_000,
      closedAt: FAKE_TIME - (index + 1) * 86_400_000,
      activeTurnId: null,
      retryMessageId: null,
    })),
  }
  const message: UserMessage = {
    id: 'ask',
    sessionId: FAKE_IDS.session,
    sender: fakeUser,
    text: 'Add address autocomplete to the checkout form. Keep the manual fields as a fallback.',
    attachments: [],
    choice: defaultChoice,
    createdAt: FAKE_TIME,
    state: 'sent',
  }
  const createdWorkspace: Workspace = {
    ...workspace,
    id: 'saved-carts',
    name: 'Lisbon',
    branch: 'calummoore/lisbon-7k2q',
    sectionId: 'general',
    state: 'starting',
    createdAt: FAKE_TIME,
    updatedAt: FAKE_TIME,
  }
  const created: CreateWorkspaceResponse = {
    workspace: createdWorkspace,
    sessionId: 'new',
    firstMessage: {
      ...message,
      sessionId: 'new',
      state: 'queued',
      text: 'Let signed-in shoppers save their cart and restore it on another device.',
    },
    error: null,
    start: {
      kind: 'create',
      startedAt: FAKE_TIME,
      steps: [
        {
          id: 'image',
          label: 'Starting from the cloud computer of Acme',
          state: 'running',
          startedAt: FAKE_TIME,
          completedAt: null,
        },
      ],
    },
  }
  const view: WorkspaceViewResponse = {
    view: {
      tabs: sessions.sessions.map((session) => ({
        kind: 'session',
        sessionId: session.id,
      })),
      activeTab: { kind: 'session', sessionId: FAKE_IDS.session },
      fileList: 'changes',
      tool: 'terminal',
    },
  }
  return { workspaces, detail, sessions, message, created, view }
}
