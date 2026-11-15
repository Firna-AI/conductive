import { parseArgs } from 'node:util'

import { ToolInputError } from './input.ts'

const string = { type: 'string' } as const
type Options = Readonly<Record<string, { type: 'string' | 'boolean' }>>
const workspace = { workspace: string }
const session = { ...workspace, session: string }
const page = { limit: string, offset: string }
const message = {
  message: string,
  'message-file': string,
  agent: string,
  model: string,
  effort: string,
  fast: string,
  'request-id': string,
}

function commandOptions(args: readonly string[]): Options {
  const [group, command] = args
  if (group === 'workspaces') {
    switch (command) {
      case 'create':
        return {
          ...message,
          repository: string,
          section: string,
          name: string,
          'first-session-title': string,
        }
      case 'list':
        return {
          ...page,
          owner: string,
          state: string,
          repository: string,
          query: string,
          'updated-since': string,
          archived: string,
        }
      case 'rename':
        return { ...workspace, name: string }
      case 'move':
        return { ...workspace, section: string }
      default:
        return workspace
    }
  }
  if (group === 'sessions') {
    switch (command) {
      case 'list':
        return { ...workspace, ...page }
      case 'read':
        return {
          ...session,
          detail: string,
          'start-line': string,
          'start-offset': string,
        }
      case 'create':
        return { ...workspace, ...message, title: string }
      case 'send':
        return { ...session, ...message }
      case 'rename':
        return { ...session, title: string }
      case 'close':
        return { ...session, 'stop-running-turn': { type: 'boolean' } }
      default:
        return session
    }
  }
  if (group === 'messages') return { ...session, 'message-id': string }
  if (group === 'sections') {
    if (command === 'create') return { name: string }
    if (command === 'delete') return { section: string }
  }
  if (group === 'previews') {
    if (command === 'open') return { ...workspace, port: string }
    if (command === 'close') return { ...workspace, preview: string }
    return workspace
  }
  return {}
}

export function toolHelpRequested(args: readonly string[]): boolean {
  if (args.length === 0) return true
  if (args[0] !== 'sessions') return args.includes('--help')
  try {
    return parseArgs({
      args: [...args],
      allowPositionals: true,
      strict: false,
      tokens: true,
      options: { ...commandOptions(args), help: { type: 'boolean' } },
    }).tokens.some(
      (token) =>
        token.kind === 'option' &&
        token.name === 'help' &&
        token.value === undefined,
    )
  } catch {
    return false
  }
}

export function parseToolArguments(
  args: readonly string[],
): Readonly<Record<string, unknown>> {
  try {
    const options = commandOptions(args)
    const parsed = parseArgs({
      args: [...args],
      allowPositionals: true,
      strict: false,
      tokens: true,
      options,
    })
    for (const token of parsed.tokens) {
      if (token.kind !== 'option') continue
      const option = options[token.name]
      if (
        !option ||
        (option.type === 'string'
          ? typeof token.value !== 'string'
          : token.value !== undefined)
      )
        throw new ToolInputError('Invalid option')
    }
    if (parsed.positionals.length !== 2)
      throw new ToolInputError('Invalid command')
    return parsed.values
  } catch {
    throw new ToolInputError(
      args[0] === 'sessions'
        ? 'Check the session options. Use --help for details.'
        : 'Check the command options. Use --help for details.',
    )
  }
}

export function cliNumber(value: unknown): number | undefined {
  return value === undefined ? undefined : Number(value)
}

export function cliFast(value: unknown): boolean | undefined {
  if (value === undefined) return undefined
  if (value === 'true') return true
  if (value === 'false') return false
  throw new ToolInputError('Choose true or false for fast mode.')
}
