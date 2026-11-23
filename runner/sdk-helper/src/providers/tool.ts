import type { ToolCall } from '../generated/ToolCall'
import { object, string } from '../parse'

/** The arguments that can name the subject of a call, in order. */
const SUBJECT_KEYS = [
  'file_path',
  'path',
  'command',
  'pattern',
  'query',
  'url',
] as const

/**
 * Agent tools that give their detail from one named argument, and never
 * from their subject. The Claude `Skill` tool names its skill in `skill`,
 * so its line reads "Used Skill brainstorming".
 */
const NAMED_TOOLS: ReadonlyMap<string, string> = new Map([['Skill', 'skill']])

/** The kind of a tool, from words in its name. */
function toolKind(name: string): ToolCall['kind'] {
  const lower = name.toLowerCase()
  if (/computer|browser/.test(lower)) return 'computer'
  if (/read/.test(lower)) return 'read'
  if (/search|grep|glob/.test(lower)) return 'search'
  if (/write|create/.test(lower)) return 'create'
  if (/edit|patch|filechange/.test(lower)) return 'edit'
  if (/bash|command|exec|shell/.test(lower)) return 'run'
  return 'other'
}

/**
 * Maps one tool call to its chat line. Three kinds of call keep the tool
 * name as the target: a call to a tool of an MCP server, which shows
 * `mcpTool`, its name without the server, a call of the kind `other`, and
 * a call to a tool of `NAMED_TOOLS`. Their verb, such as "Used", does not
 * say which tool ran. A tool of `NAMED_TOOLS` shows only its named argument
 * as the detail. The others show their subject, or else their description.
 * Any other call shows its subject as the target, and its description as
 * the detail.
 */
export function mapTool(
  id: string,
  name: string,
  input: unknown,
  state: ToolCall['state'],
  mcpTool: string | null = null,
): ToolCall {
  const args = input !== null && typeof input === 'object' ? object(input) : {}
  const text = (key: string) =>
    typeof args[key] === 'string' ? string(args[key]) : null
  const subjectKey = SUBJECT_KEYS.find((key) => text(key) !== null)
  const subject = subjectKey ? text(subjectKey) : null
  const description = text('description')
  const kind = toolKind(name)
  const namedKey = mcpTool === null ? NAMED_TOOLS.get(name) : undefined
  const keepsName =
    mcpTool !== null || kind === 'other' || namedKey !== undefined
  const target = keepsName ? (mcpTool ?? name) : (subject ?? name)
  const detail =
    namedKey !== undefined
      ? text(namedKey)
      : keepsName
        ? (subject ?? description)
        : description
  return { id, kind, target, detail, omittedDetailBytes: 0, state }
}
