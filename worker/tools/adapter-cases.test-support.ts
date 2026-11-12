import {
  agentPreviewClosePath,
  agentPreviewsPath,
} from '../../src/shared/agent-previews'
import { agentSectionDeletePath } from '../../src/shared/agent-sections'
import {
  agentMessagePath,
  agentSessionPath,
  agentSessionPaths,
  agentSessionsPath,
} from '../../src/shared/agent-session-paths'
import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import {
  agentWorkspacePath,
  agentWorkspacePaths,
} from '../../src/shared/agent-workspaces'

interface AdapterCase {
  cli: readonly string[]
  name: string
  args: Record<string, unknown>
  path: string
  body?: Record<string, unknown>
  query?: Record<string, string>
  reply: object
}

const workspaceId = 'teammate-workspace'
const sessionId = 'session / one'
const messageId = 'message / one'
const previewId = 'preview / one'
const sessionCli = ['--workspace', workspaceId, '--session', sessionId]

export const ADAPTER_CASES: readonly AdapterCase[] = [
  {
    cli: ['workspaces', 'get'],
    name: 'get_workspace',
    args: {},
    path: agentWorkspacePath(),
    reply: {
      workspace: {
        id: 'calling-workspace',
        owner: { id: 'owner', githubLogin: 'owner-login', displayName: null },
        repository: { id: 'repo-a' },
        section: { id: 'general-a' },
        baseBranch: 'main',
      },
    },
  },
  {
    cli: [
      'workspaces',
      'rename',
      '--workspace',
      workspaceId,
      '--name',
      'New name',
    ],
    name: 'rename_workspace',
    args: { workspaceId, name: 'New name' },
    path: agentWorkspacePaths.rename(workspaceId),
    body: { name: 'New name' },
    reply: { workspace: { id: workspaceId } },
  },
  {
    cli: [
      'workspaces',
      'move',
      '--workspace',
      workspaceId,
      '--section',
      'chosen-a',
    ],
    name: 'move_workspace',
    args: { workspaceId, sectionId: 'chosen-a' },
    path: agentWorkspacePaths.move(workspaceId),
    body: { sectionId: 'chosen-a' },
    reply: { workspace: { id: workspaceId } },
  },
  {
    cli: ['workspaces', 'archive', '--workspace', workspaceId],
    name: 'archive_workspace',
    args: { workspaceId },
    path: agentWorkspacePaths.archive(workspaceId),
    body: {},
    reply: { workspace: { id: workspaceId } },
  },
  {
    cli: ['sessions', 'get', ...sessionCli],
    name: 'get_session',
    args: { workspaceId, sessionId },
    path: agentSessionPath(workspaceId, sessionId),
    reply: { session: { id: sessionId, closed: false, state: 'idle' } },
  },
  {
    cli: ['sessions', 'rename', ...sessionCli, '--title', 'New title'],
    name: 'rename_session',
    args: { workspaceId, sessionId, title: 'New title' },
    path: agentSessionPaths.rename(workspaceId, sessionId),
    body: { title: 'New title' },
    reply: { session: { id: sessionId } },
  },
  {
    cli: ['sessions', 'close', ...sessionCli, '--stop-running-turn'],
    name: 'close_session',
    args: { workspaceId, sessionId, stopRunningTurn: true },
    path: agentSessionPaths.close(workspaceId, sessionId),
    body: { stopRunningTurn: true },
    reply: { session: { id: sessionId, closed: true } },
  },
  {
    cli: ['sessions', 'stop', ...sessionCli],
    name: 'stop_session',
    args: { workspaceId, sessionId },
    path: agentSessionPaths.stop(workspaceId, sessionId),
    body: {},
    reply: { session: { id: sessionId }, state: 'idle', turnId: null },
  },
  {
    cli: ['messages', 'get', ...sessionCli, '--message-id', messageId],
    name: 'get_message',
    args: { workspaceId, sessionId, messageId },
    path: agentMessagePath(workspaceId, sessionId, messageId),
    reply: {
      message: { id: messageId, text: 'Exact message\r\n\n' },
      turnId: null,
    },
  },
  {
    cli: ['sections', 'create', '--name', 'Reviews'],
    name: 'create_section',
    args: { name: 'Reviews' },
    path: MACHINE_PATHS.sections,
    body: { name: 'Reviews' },
    reply: { section: { id: 'new-section', name: 'Reviews', default: false } },
  },
  {
    cli: ['sections', 'delete', '--section', 'general-a'],
    name: 'delete_section',
    args: { sectionId: 'general-a' },
    path: agentSectionDeletePath('general-a'),
    body: {},
    reply: { deleted: false },
  },
  {
    cli: ['previews', 'list', '--workspace', workspaceId],
    name: 'list_previews',
    args: { workspaceId },
    path: agentPreviewsPath(workspaceId),
    reply: { previews: [{ id: previewId, port: 4321 }] },
  },
  {
    cli: ['previews', 'open', '--workspace', workspaceId, '--port', '4321'],
    name: 'open_preview',
    args: { workspaceId, port: 4321 },
    path: agentPreviewsPath(workspaceId),
    body: { port: 4321 },
    reply: { preview: { id: previewId, port: 4321 } },
  },
  {
    cli: [
      'previews',
      'close',
      '--workspace',
      workspaceId,
      '--preview',
      previewId,
    ],
    name: 'close_preview',
    args: { workspaceId, previewId },
    path: agentPreviewClosePath(workspaceId, previewId),
    body: {},
    reply: { closed: false },
  },
  {
    cli: [
      'workspaces',
      'list',
      '--owner',
      'teammate',
      '--state',
      'ready',
      '--repository',
      'repo-a',
      '--query',
      'Par',
      '--updated-since',
      '-1',
      '--archived',
      'false',
      '--limit',
      '1',
      '--offset',
      '0',
    ],
    name: 'list_workspaces',
    args: {
      ownerId: 'teammate',
      state: 'ready',
      repositoryId: 'repo-a',
      query: 'Par',
      updatedSince: -1,
      archived: false,
      limit: 1,
      offset: 0,
    },
    path: MACHINE_PATHS.workspaces,
    query: {
      ownerId: 'teammate',
      state: 'ready',
      repositoryId: 'repo-a',
      query: 'Par',
      updatedSince: '-1',
      archived: 'false',
      limit: '1',
      offset: '0',
    },
    reply: {
      workspaces: [
        {
          id: workspaceId,
          owner: {
            id: 'teammate',
            githubLogin: 'teammate-login',
            displayName: null,
          },
        },
      ],
      hasMore: false,
    },
  },
  {
    cli: ['workspaces', 'list', '--archived', 'true'],
    name: 'list_workspaces',
    args: { archived: true },
    path: MACHINE_PATHS.workspaces,
    query: { archived: 'true' },
    reply: { workspaces: [{ id: 'archived-workspace' }] },
  },
  {
    cli: [
      'sessions',
      'list',
      '--workspace',
      workspaceId,
      '--limit',
      '1',
      '--offset',
      '2',
    ],
    name: 'list_sessions',
    args: { workspaceId, limit: 1, offset: 2 },
    path: agentSessionsPath(workspaceId),
    query: { limit: '1', offset: '2' },
    reply: { sessions: [{ id: sessionId }], hasMore: true },
  },
  {
    cli: [
      'workspaces',
      'create',
      '--repository',
      'repo-a',
      '--message',
      'Start',
      '--first-session-title',
      'First title',
      '--request-id',
      'stable-create',
    ],
    name: 'create_workspace',
    args: {
      repositoryId: 'repo-a',
      firstMessage: 'Start',
      firstSessionTitle: 'First title',
      requestId: 'stable-create',
    },
    path: MACHINE_PATHS.workspaces,
    body: {
      repositoryId: 'repo-a',
      firstMessage: 'Start',
      firstSessionTitle: 'First title',
      requestId: 'stable-create',
    },
    reply: {
      workspace: { id: 'created-workspace' },
      sessionId: 'created-session',
    },
  },
]
