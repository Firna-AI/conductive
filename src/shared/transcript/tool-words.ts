import type { ToolCall } from '../chat-events'

const verbs: Readonly<
  Record<ToolCall['kind'], { done: string; running: string }>
> = {
  read: { done: 'Read', running: 'Reading' },
  search: { done: 'Searched', running: 'Searching' },
  create: { done: 'Created', running: 'Creating' },
  edit: { done: 'Edited', running: 'Editing' },
  run: { done: 'Ran', running: 'Running' },
  computer: { done: 'Used', running: 'Using' },
  other: { done: 'Used', running: 'Using' },
}

const endings: Readonly<Partial<Record<ToolCall['state'], string>>> = {
  stopped: 'Stopped',
  failed: 'Failed',
}

export function toolVerb(call: ToolCall): string {
  if (call.skills?.length) {
    const verb = call.state === 'running' ? 'Using' : 'Used'
    return `${verb} ${call.skills.length === 1 ? 'skill' : 'skills'}`
  }
  const words = verbs[call.kind]
  return call.state === 'running' ? words.running : words.done
}

export function toolEnding(call: ToolCall): string | undefined {
  return endings[call.state]
}

/** A run with a call in progress or not done starts open. */
export function toolRunOpen(calls: readonly ToolCall[]): boolean {
  return calls.some((call) => call.state !== 'done')
}

/** A count for the line of a fold, such as "1 tool call": none for zero. */
function counted(count: number, noun: string): string[] {
  return count === 0 ? [] : [`${count} ${noun}${count === 1 ? '' : 's'}`]
}

/** The counts of a fold, with no zero count. */
export function foldLabel(calls: number, messages = 0): string {
  return [...counted(calls, 'tool call'), ...counted(messages, 'message')].join(
    ', ',
  )
}

/** Names for a fold, once in first-use order, without failed or stopped calls. */
export function foldSkills(calls: readonly ToolCall[]): readonly string[] {
  const loaded = calls.filter(
    (call) => call.state !== 'failed' && call.state !== 'stopped',
  )
  return [...new Set(loaded.flatMap((call) => call.skills ?? []))]
}

/** The words before the skill names of a fold: "Skill:" for one, else "Skills:". */
export function foldSkillHeading(count: number): string {
  return count === 1 ? 'Skill:' : 'Skills:'
}

/** The skill text after a fold's counts, without a separator. */
export function foldSkillLabel(calls: readonly ToolCall[]): string {
  const names = foldSkills(calls)
  if (names.length === 0) return ''
  return `${foldSkillHeading(names.length)} ${names.join(', ')}`
}
