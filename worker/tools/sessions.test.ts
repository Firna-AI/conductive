import { afterEach, beforeAll, expect, it } from 'vitest'

import { sessionLink } from '../../src/shared/session-link'
import { sessionPaths } from '../../src/shared/sessions'
import { record, text } from '../../tools/input'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
  OTHER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { CLAUDE } from '../chat/harness.test-support'
import { mcpRepliesById } from './mcp-test-support'
import {
  sessionToolFixture,
  type SessionToolFixture,
} from './session-test-support'

let bundle: string
let fixture: SessionToolFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

function cliReply(output: Awaited<ReturnType<SessionToolFixture['cli']>>) {
  expect(output.status, output.stderr.join('')).toBe(0)
  expect(output.stderr).toEqual([])
  expect(output.stdout).toHaveLength(1)
  expect(output.stdout[0]).toMatch(/^\{/)
  return record(JSON.parse(output.stdout[0]))
}

function mcpReply(output: Awaited<ReturnType<SessionToolFixture['mcp']>>) {
  expect(output.status).toBe(0)
  expect(output.stderr).toEqual([])
  const reply = mcpRepliesById(output.stdout).call
  expect(reply).toMatchObject({ result: { isError: false } })
  const result = record(reply.result)
  expect(result.content).toEqual([
    { type: 'text', text: JSON.stringify(result.structuredContent) },
  ])
  return record(result.structuredContent)
}

it('runs CLI session creation, reads, and replayed messages through the stored caller', async () => {
  const active = (fixture = await sessionToolFixture(bundle))
  const opaque = await active.cli(['read', '--session', '-missing'], false)
  expect(opaque.stderr).toEqual([
    'session_not_found: The session is not available.\n',
  ])
  for (const args of [
    ['read', '--session'],
    ['list', '--unknown'],
  ]) {
    const invalidOptions = await active.cli(args, false)
    expect(invalidOptions.status).toBe(1)
    expect(invalidOptions.stderr).toEqual([
      'Check the session options. Use --help for details.\n',
    ])
  }
  const empty = cliReply(await active.cli(['create', '--title', 'keep_name']))
  expect(empty).toMatchObject({
    workspace: { id: OUTER_WORKSPACE },
    session: { title: 'keep_name', startedBy: { id: 'member' } },
    message: null,
    turnId: null,
    resume: { state: 'not_needed', error: null },
  })
  const original = '  Review this change.\nKeep this spacing.  '
  const created = cliReply(
    await active.cli([
      'create',
      '--workspace',
      OTHER_WORKSPACE,
      '--message',
      original,
      '--agent',
      CLAUDE.agent,
      '--model',
      CLAUDE.model,
      '--effort',
      'max',
      '--request-id',
      'cli-create',
    ]),
  )
  const sessionId = text(record(created.session).id)
  const link = sessionLink(
    active.env.APP_ORIGIN,
    OUTER_ORG,
    OTHER_WORKSPACE,
    sessionId,
  )
  const footer = `\n\n---\nSent by: ${sessionLink(active.env.APP_ORIGIN, OUTER_ORG, OUTER_WORKSPACE, active.sourceSessionId)}`
  expect(created).toMatchObject({
    session: { id: sessionId, link, choice: { ...CLAUDE, effort: 'max' } },
    message: { text: original + footer, sender: { id: 'member' } },
    turnId: expect.any(String),
  })
  const send = [
    'send',
    '--workspace',
    OTHER_WORKSPACE,
    '--session',
    sessionId,
    '--message',
    '--help',
    '--request-id',
    '..',
  ]
  const accepted = cliReply(await active.cli(send))
  expect(accepted).toMatchObject({
    session: { id: sessionId, link, choice: { ...CLAUDE, effort: 'max' } },
    message: { text: '--help' + footer },
    turnId: created.turnId,
  })
  expect(cliReply(await active.cli(send))).toEqual(accepted)
  const listed = cliReply(await active.cli(['list'], false))
  expect(listed).toMatchObject({ workspace: { id: OUTER_WORKSPACE } })
  expect(listed.sessions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: record(empty.session).id,
        title: 'keep_name',
        closed: false,
      }),
    ]),
  )
  const read = cliReply(
    await active.cli(
      [
        'read',
        '--workspace',
        OTHER_WORKSPACE,
        '--session',
        sessionId,
        '--detail',
        'full',
        '--start-line',
        '1',
        '--start-offset',
        '0',
      ],
      false,
    ),
  )
  expect(read).toMatchObject({
    session: { id: sessionId, link },
    detail: 'full',
    startLine: 1,
    startOffset: 0,
    next: null,
  })
  expect(read.markdown).toContain(original + footer)
  expect(read.markdown).toContain('--help' + footer)
  const readUrl = new URL(active.requests.at(-1)?.url ?? '')
  expect(readUrl.searchParams.get('startOffset')).toBe('0')
  const invalid = await active.cli([
    'send',
    '--session',
    sessionId,
    '--message',
    'x',
    '--model',
    'orphan',
  ])
  expect(invalid.status).toBe(1)
  expect(invalid.stderr).toEqual([
    'Choose Claude or Codex for the workspace.\n',
  ])
})

it('runs MCP session calls with caller defaults and actionable Worker refusals', async () => {
  const active = (fixture = await sessionToolFixture(bundle))
  const created = mcpReply(
    await active.mcp('create_session', {
      workspaceId: OTHER_WORKSPACE,
      title: 'MCP review',
    }),
  )
  const sessionId = text(record(created.session).id)
  expect(created).toMatchObject({
    message: null,
    turnId: null,
    session: { choice: CLAUDE },
  })
  const sent = mcpReply(
    await active.mcp('send_message', {
      workspaceId: OTHER_WORKSPACE,
      sessionId,
      text: '  Work from MCP.  ',
    }),
  )
  expect(sent).toMatchObject({
    message: {
      text: expect.stringContaining('  Work from MCP.  \n\n---\nSent by: '),
    },
    turnId: expect.any(String),
    session: { id: sessionId, link: record(created.session).link },
  })
  const sentInput = record(
    JSON.parse((await active.requests.at(-1)?.text()) ?? '{}'),
  )
  expect(sentInput.requestId).toEqual(expect.any(String))
  expect(sentInput.requestId).not.toBe('')
  const listed = mcpReply(await active.mcp('list_sessions', {}, false))
  expect(listed.workspace).toMatchObject({ id: OUTER_WORKSPACE })
  const read = mcpReply(
    await active.mcp(
      'read_session',
      { workspaceId: OTHER_WORKSPACE, sessionId },
      false,
    ),
  )
  expect(read).toMatchObject({
    detail: 'concise',
    session: { id: sessionId },
    next: null,
  })
  expect(read.markdown).toContain('Work from MCP.')
  await active.request(
    sessionPaths.close(OUTER_ORG, OTHER_WORKSPACE, sessionId),
    {
      method: 'POST',
      body: JSON.stringify({ stopRunningTurn: true }),
    },
  )
  const refused = await active.mcp('send_message', {
    workspaceId: OTHER_WORKSPACE,
    sessionId,
    text: 'Closed',
  })
  expect(mcpRepliesById(refused.stdout).call).toMatchObject({
    result: {
      isError: true,
      content: [
        {
          type: 'text',
          text: 'session_closed: Reopen the session to send a message.',
        },
      ],
    },
  })
  const missing = await active.cli(['read', '--session', 'unknown'], false)
  expect(missing.status).toBe(1)
  expect(missing.stderr).toEqual([
    'session_not_found: The session is not available.\n',
  ])
})
