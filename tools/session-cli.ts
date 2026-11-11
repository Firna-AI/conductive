import { parseArgs } from 'node:util'

import type { WorkspaceToolClient } from './client.ts'
import {
  createSessionInput,
  readSessionInput,
  sendSessionInput,
  sessionWorkspace,
  text,
  ToolInputError,
} from './input.ts'

export const SESSION_CLI_HELP = `conductive sessions list [--workspace ID]
conductive sessions read --session ID [--workspace ID] [--detail concise|full]
  [--start-line NUMBER] [--start-offset NUMBER]
conductive sessions create [--workspace ID] [--title TEXT] [--message TEXT]
  [--agent claude|codex --model NAME] [--effort LEVEL] [--request-id ID]
conductive sessions send --session ID --message TEXT [--workspace ID]
  [--agent claude|codex --model NAME] [--effort LEVEL] [--request-id ID]

Session calls default to the calling workspace and reach this org's workspaces.
Session list and read need only the workspace token. Create and send need an active turn.
Create uses the turn sender's default choice. Send keeps the session's choice when omitted.
Read defaults to concise and returns the newest text. Use start-line and start-offset for earlier text.
Use next.line and next.offset as the next read's start-line and start-offset.
A session link holds both the workspace ID and the session ID.
Workspace and session links in an answer show as chips.
A Sent by: line names the session that sent the message. Do not reply only to confirm it.
--title: Use plain words separated by spaces. Avoid underscores unless the user tells you to add them.
`

function sessionOptions(command: string | undefined) {
  const common = { workspace: { type: 'string' as const } }
  const message = {
    ...common,
    message: { type: 'string' as const },
    agent: { type: 'string' as const },
    model: { type: 'string' as const },
    effort: { type: 'string' as const },
    'request-id': { type: 'string' as const },
  }
  return command === 'list'
    ? common
    : command === 'read'
      ? {
          ...common,
          session: { type: 'string' as const },
          detail: { type: 'string' as const },
          'start-line': { type: 'string' as const },
          'start-offset': { type: 'string' as const },
        }
      : command === 'create'
        ? { ...message, title: { type: 'string' as const } }
        : { ...message, session: { type: 'string' as const } }
}

export function sessionHelpRequested(args: readonly string[]): boolean {
  try {
    const parsed = parseArgs({
      args: [...args],
      allowPositionals: true,
      strict: false,
      tokens: true,
      options: { ...sessionOptions(args[1]), help: { type: 'boolean' } },
    })
    return parsed.tokens.some(
      (token) =>
        token.kind === 'option' &&
        token.name === 'help' &&
        token.value === undefined,
    )
  } catch {
    return false
  }
}

export async function runSessionCli(
  args: readonly string[],
  client: WorkspaceToolClient,
): Promise<unknown> {
  const command = args[1]
  const options = sessionOptions(command)
  let parsed
  try {
    // Opaque IDs and message text can start with a dash.
    parsed = parseArgs({
      args: [...args],
      allowPositionals: true,
      strict: false,
      tokens: true,
      options,
    })
    for (const token of parsed.tokens) {
      if (
        token.kind === 'option' &&
        (!Object.hasOwn(options, token.name) || typeof token.value !== 'string')
      )
        throw new ToolInputError(
          'Check the session options. Use --help for details.',
        )
    }
  } catch {
    throw new ToolInputError(
      'Check the session options. Use --help for details.',
    )
  }
  if (parsed.positionals.length !== 2)
    throw new ToolInputError('Use sessions list, read, create, or send.')
  const values: Readonly<Record<string, unknown>> = parsed.values
  const workspaceId = sessionWorkspace(values.workspace)
  const fields = {
    firstMessage: values.message,
    text: values.message,
    title: values.title,
    ...(values.agent !== undefined || values.model !== undefined
      ? { model: { agent: values.agent, model: values.model } }
      : {}),
    effort: values.effort,
    requestId: values['request-id'],
  }
  switch (command) {
    case 'list':
      return client.listSessions(workspaceId)
    case 'read':
      return client.readSession(
        text(values.session),
        readSessionInput({
          detail: values.detail,
          ...(values['start-line'] !== undefined && {
            startLine: Number(values['start-line']),
          }),
          ...(values['start-offset'] !== undefined && {
            startOffset: Number(values['start-offset']),
          }),
        }),
        workspaceId,
      )
    case 'create':
      return client.createSession(createSessionInput(fields), workspaceId)
    case 'send':
      return client.sendMessage(
        text(values.session),
        sendSessionInput(fields),
        workspaceId,
      )
    default:
      throw new ToolInputError('Use sessions list, read, create, or send.')
  }
}
