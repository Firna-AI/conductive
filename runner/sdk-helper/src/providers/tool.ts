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
 * Agent tools whose name is always the target, with the one argument that
 * gives their detail. The Claude `Skill` tool names its skill in `skill`,
 * so its line reads "Used Skill brainstorming".
 */
const NAMED_TOOLS: ReadonlyMap<string, string> = new Map([['Skill', 'skill']])

/**
 * Maps one tool call to its chat line. A call to a tool of an MCP server
 * shows `mcpTool`, its name without the server, and its subject as the
 * detail. A call to a tool of `NAMED_TOOLS` shows its name, and only its
 * named argument as the detail, whatever other arguments it has. Any other
 * call shows its subject, and its description as the detail.
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
  const namedKey = mcpTool === null ? NAMED_TOOLS.get(name) : undefined
  const target = mcpTool ?? (namedKey === undefined ? (subject ?? name) : name)
  const detail =
    namedKey !== undefined
      ? text(namedKey)
      : mcpTool !== null
        ? (subject ?? description)
        : description
  const lower = name.toLowerCase()
  const kind = /computer|browser/.test(lower)
    ? 'computer'
    : /read/.test(lower)
      ? 'read'
      : /search|grep|glob/.test(lower)
        ? 'search'
        : /write|create/.test(lower)
          ? 'create'
          : /edit|patch|filechange/.test(lower)
            ? 'edit'
            : /bash|command|exec|shell/.test(lower)
              ? 'run'
              : 'other'
  return { id, kind, target, detail, omittedDetailBytes: 0, state }
}
