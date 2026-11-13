import type { WorkspaceToolClient } from './client.ts'
import { cliFast, cliNumber, parseToolArguments } from './cli-options.ts'
import {
  createSessionInput,
  readSessionInput,
  sendSessionInput,
  sessionWorkspace,
  text,
  ToolInputError,
} from './input.ts'
import { listSessionsInput } from './list-input.ts'
import { cliMessage, type MessageInput } from './message-input.ts'

export async function runSessionCli(
  args: readonly string[],
  client: WorkspaceToolClient,
  input?: MessageInput,
): Promise<unknown> {
  const values = parseToolArguments(args)
  const workspaceId = sessionWorkspace(values.workspace)
  switch (args[1]) {
    case 'list':
      return client.listSessions(
        workspaceId,
        listSessionsInput({
          limit: cliNumber(values.limit),
          offset: cliNumber(values.offset),
        }),
      )
    case 'get':
      return client.getSession(text(values.session), workspaceId)
    case 'rename':
      return client.renameSession(
        text(values.session),
        { title: text(values.title) },
        workspaceId,
      )
    case 'close':
      return client.closeSession(
        text(values.session),
        { stopRunningTurn: values['stop-running-turn'] === true },
        workspaceId,
      )
    case 'stop':
      return client.stopSession(text(values.session), workspaceId)
    case 'read':
      return client.readSession(
        text(values.session),
        readSessionInput({
          detail: values.detail,
          startLine: cliNumber(values['start-line']),
          startOffset: cliNumber(values['start-offset']),
        }),
        workspaceId,
      )
    case 'create':
    case 'send': {
      const message = await cliMessage(values, input)
      const fields = {
        firstMessage: message,
        text: message,
        title: values.title,
        ...((values.agent !== undefined || values.model !== undefined) && {
          model: { agent: values.agent, model: values.model },
        }),
        effort: values.effort,
        fast: cliFast(values.fast),
        requestId: values['request-id'],
      }
      return args[1] === 'create'
        ? client.createSession(createSessionInput(fields), workspaceId)
        : client.sendMessage(
            text(values.session),
            sendSessionInput(fields),
            workspaceId,
          )
    }
    default:
      throw new ToolInputError(
        'Use sessions list, get, read, create, send, rename, close, or stop.',
      )
  }
}
