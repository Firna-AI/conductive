import { afterEach, beforeEach, expect, it, onTestFinished, vi } from 'vitest'

import { mockComputerServer } from '../../test-support/computer-mcp'
import { duringTurn, turn } from '../../test-support/harness'
import { instructionProviders } from '../../test-support/instructions'
import { wireFixture } from '../../test-support/wire'
import { configuration } from '../config'
import * as instructions from '../instructions'
import { string } from '../parse'
import { Runner } from '../runner'
import { EventStore, type SavedSession } from '../state'
import * as environment from './environment'
import type { ProviderOptions } from './types'

beforeEach(() => {
  mockComputerServer()
  vi.spyOn(environment, 'prepareProviderHome').mockResolvedValue()
})

afterEach(() => vi.restoreAllMocks())

it.each(['claude', 'codex'] as const)(
  'keeps %s instructions after a restart and sends each member with the original attachments',
  async (agent) => {
    const h = await wireFixture()
    await h.runner.close()
    await h.store.remember({
      sessionId: 'session-1',
      agent,
      providerSessionId: 'legacy-conversation',
    })
    let store = await EventStore.open(h.storage)
    const savedBeforeStart: SavedSession[][] = []
    const provider = instructionProviders(agent)
    const settings = {
      CONDUCTIVE_WORKSPACE_ID: 'workspace-1',
      CONDUCTIVE_WORKSPACE_TOKEN: h.options.request.workspaceToken,
      CONDUCTIVE_RUNNER_URL: h.endpoint.url,
      CONDUCTIVE_REPOSITORY: '/cloud/workspace',
      CONDUCTIVE_DEFAULT_BRANCH: 'target-main',
      CONDUCTIVE_WORKSPACE_BRANCH: 'alice/tracked-task',
      CONDUCTIVE_REPOSITORY_ZETA_DIR: '/cloud/zeta',
      CONDUCTIVE_REPOSITORY_APP_DIR: '/cloud/workspace',
      CONDUCTIVE_REPOSITORY_API_DIR: '/cloud/api',
      CONDUCTIVE_REPOSITORY_API_TOKEN: 'do-not-copy-token',
      ORG_SECRET: 'do-not-copy-secret',
    }
    const options = {
      ...h.options,
      ...configuration(settings),
      store,
      providers: {
        ...h.options.providers,
        [agent]: async (options: ProviderOptions) => {
          savedBeforeStart.push(store.snapshot.sessions)
          return provider.open(options)
        },
      },
    }
    let runner = new Runner(options)
    onTestFinished(() => runner.close())
    await runner.start(false)
    const first = turn('first', 'alice', agent)
    first.message.sender.id = 'member-alice-id'
    first.message.sender.displayName = ' Alice\r\nExample\u2028 Member '
    first.message.text = '  Keep this text.\n\nAnd this line.  '
    first.message.attachments = [
      {
        id: 'image',
        name: 'image.png',
        path: null,
        kind: 'image',
        mediaType: 'image/png',
        sizeBytes: 10,
      },
      {
        id: 'file',
        name: 'notes.txt',
        path: null,
        kind: 'file',
        mediaType: 'text/plain',
        sizeBytes: 20,
      },
    ]
    first.attachments = [
      { attachmentId: 'image', path: '/uploads/image.png' },
      { attachmentId: 'file', path: '/uploads/notes.txt' },
    ]
    const original = structuredClone(first)
    await runner.engine.command(first)
    await runner.idle()
    expect(provider.prompt()).toEqual(expect.any(String))
    const initialPrompt = string(provider.prompt())
    expect(initialPrompt).toContain('Conductive')
    for (const tool of [
      'create_session',
      'list_sessions',
      'send_message',
      'read_session',
      'get_workspace',
      'rename_workspace',
      'move_workspace',
      'archive_workspace',
      'get_session',
      'rename_session',
      'close_session',
      'stop_session',
      'get_message',
      'create_section',
      'delete_section',
      'list_previews',
      'open_preview',
      'close_preview',
    ])
      expect(initialPrompt).toContain(tool)
    expect(initialPrompt).toContain(
      'A Sent by: line names the session that sent the message.',
    )
    expect(initialPrompt).toContain('Do not reply only to confirm it.')
    expect(initialPrompt).toContain(
      'Workspace repository folder: "/cloud/workspace"',
    )
    expect(initialPrompt).toContain('Workspace branch: "alice/tracked-task"')
    expect(initialPrompt).toContain('Target branch: "target-main"')
    expect(initialPrompt).toContain(
      'CONDUCTIVE_REPOSITORY_API_DIR: "/cloud/api"',
    )
    expect(initialPrompt).toContain(
      'CONDUCTIVE_REPOSITORY_APP_DIR: "/cloud/workspace"',
    )
    expect(initialPrompt).toContain(
      'CONDUCTIVE_REPOSITORY_ZETA_DIR: "/cloud/zeta"',
    )
    expect(initialPrompt).toContain(
      'Context folder: "/cloud/workspace/.context"',
    )
    expect(initialPrompt).toContain(
      'Git ignores the context folder. Keep notes, screenshots, and files for other sessions of this workspace there. Attached files arrive in its attachments folder.',
    )
    expect(initialPrompt).not.toMatch(/do-not-copy|Boat|Claude Code/)
    expect(savedBeforeStart[0]).toEqual([
      {
        sessionId: 'session-1',
        agent,
        providerSessionId: 'legacy-conversation',
        instructions: initialPrompt,
        instructionBranches: {
          workspaceBranch: 'alice/tracked-task',
          targetBranch: 'target-main',
        },
      },
    ])
    expect(provider.conversationId()).toBe('legacy-conversation')
    const firstInput = await provider.input()
    expect(firstInput).toMatchObject(
      agent === 'claude'
        ? {
            role: 'user',
            content:
              'Sender: Alice Example Member (@alice) [member ID: "member-alice-id"]\n\n  Keep this text.\n\nAnd this line.  \nThe sender attached these files. Read each file, or the parts of a large file that you need, before you answer.\nAttached file: {"name":"image.png","mediaType":"image/png","path":"/uploads/image.png","sizeBytes":10}\nAttached file: {"name":"notes.txt","mediaType":"text/plain","path":"/uploads/notes.txt","sizeBytes":20}',
          }
        : {
            input: [
              {
                type: 'text',
                text: 'Sender: Alice Example Member (@alice) [member ID: "member-alice-id"]\n\n  Keep this text.\n\nAnd this line.  ',
                text_elements: [],
              },
              {
                type: 'text',
                text: 'The sender attached these files. Read each file, or the parts of a large file that you need, before you answer. Each image is also in this message.',
                text_elements: [],
              },
              {
                type: 'text',
                text: 'Attached file: {"name":"image.png","mediaType":"image/png","path":"/uploads/image.png","sizeBytes":10}',
                text_elements: [],
              },
              { type: 'localImage', path: '/uploads/image.png' },
              {
                type: 'text',
                text: 'Attached file: {"name":"notes.txt","mediaType":"text/plain","path":"/uploads/notes.txt","sizeBytes":20}',
                text_elements: [],
              },
            ],
          },
    )
    const during = {
      ...duringTurn(turn('during', 'bob', agent)),
      type: 'message' as const,
      turnId: first.turnId,
    }
    during.message.sender.id = 'member-bob-id'
    const originalDuring = structuredClone(during)
    await runner.engine.command(during)
    await runner.idle()
    const nextInput = await provider.input(true)
    expect(nextInput).toMatchObject(
      agent === 'claude'
        ? {
            role: 'user',
            content:
              'Sender: @bob [member ID: "member-bob-id"]\n\nChange the file.',
          }
        : {
            input: [
              {
                type: 'text',
                text: 'Sender: @bob [member ID: "member-bob-id"]\n\nChange the file.',
                text_elements: [],
              },
            ],
          },
    )
    expect(first).toEqual(original)
    expect(during).toEqual(originalDuring)
    await runner.close()
    const build = instructions.agentInstructions
    vi.spyOn(instructions, 'agentInstructions').mockImplementation(
      (context) => {
        const current = build(context)
        return {
          claude: `Changed Claude base guidance.\n\n${current.claude}`,
          codex: `Changed workspace guidance.\n\n${current.codex}`,
        }
      },
    )
    store = await EventStore.open(h.storage)
    runner = new Runner({
      ...options,
      ...configuration({
        ...settings,
        CONDUCTIVE_REPOSITORY: '/cloud/new-workspace',
        CONDUCTIVE_DEFAULT_BRANCH: 'new-target',
        CONDUCTIVE_WORKSPACE_BRANCH: 'bob/new-task',
        CONDUCTIVE_REPOSITORY_API_DIR: '/cloud/new-api',
      }),
      store,
    })
    await runner.start(false)
    await runner.engine.command(turn('resumed', 'bob', agent))
    await runner.idle()
    expect(provider.prompt()).toBe(initialPrompt)
    expect(provider.conversationId()).toBe(
      agent === 'claude' ? 'legacy-conversation' : 'codex-conversation',
    )
    const fresh = turn('fresh', 'bob', agent)
    fresh.sessionId = 'new-session'
    fresh.message.sessionId = 'new-session'
    await runner.engine.command(fresh)
    await runner.idle()
    const currentPrompt = provider.prompt()
    expect(currentPrompt).toContain(
      agent === 'claude'
        ? 'Changed Claude base guidance.'
        : 'Changed workspace guidance.',
    )
    expect(currentPrompt).toContain(
      'Workspace repository folder: "/cloud/new-workspace"',
    )
    expect(currentPrompt).toContain(
      'Context folder: "/cloud/new-workspace/.context"',
    )
    expect(currentPrompt).toContain('Workspace branch: "bob/new-task"')
    expect(currentPrompt).toContain('Target branch: "new-target"')
    expect(currentPrompt).toContain(
      'CONDUCTIVE_REPOSITORY_API_DIR: "/cloud/new-api"',
    )
    expect(provider.parameters()).not.toHaveProperty(
      agent === 'claude' ? 'resume' : 'baseInstructions',
    )
    expect(savedBeforeStart.at(-1)).toContainEqual({
      sessionId: 'new-session',
      agent,
      providerSessionId: null,
      instructions: currentPrompt,
      instructionBranches: {
        workspaceBranch: 'bob/new-task',
        targetBranch: 'new-target',
      },
    })
    expect(h.warnings).toEqual([])
  },
)
