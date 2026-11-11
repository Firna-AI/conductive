import type { ToolCall } from '../../../src/shared/chat-events'
import { object, string } from '../parse'

export function mapTool(
  id: string,
  name: string,
  input: unknown,
  state: ToolCall['state'],
): ToolCall {
  let target = name
  let detail: string | null = null
  if (input !== null && typeof input === 'object') {
    const args = object(input)
    if (
      name === 'Skill' &&
      typeof args.skill === 'string' &&
      args.skill !== ''
    ) {
      return {
        id,
        kind: 'other',
        skills: [args.skill],
        target: args.skill,
        detail:
          typeof args.args === 'string' && args.args !== '' ? args.args : null,
        omittedDetailBytes: 0,
        state,
      }
    }
    for (const key of [
      'file_path',
      'path',
      'command',
      'pattern',
      'query',
      'url',
    ]) {
      if (typeof args[key] === 'string') {
        target = string(args[key])
        break
      }
    }
    if (typeof args.description === 'string') detail = args.description
  }
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
