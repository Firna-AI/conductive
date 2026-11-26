/**
 * The words of the note of a change of the capabilities of a workspace.
 * The note shows in the chat of each session whose facts the change touched.
 * The agent of that session gets the same words. The facts of a session
 * are the secrets that it uses with no approval. The note names the member
 * who made the change and each change. It names secrets only, never a value.
 * The app and the mockups take the words from here.
 */

/**
 * One change of the facts of a session, from one write. A write gives at
 * most one change of each kind, and each change names its secrets.
 */
export type CapabilityChange =
  | { kind: 'pre-approved'; names: readonly string[] }
  | { kind: 'pre-approval-removed'; names: readonly string[] }
  /** Approvals of this session that a member removed. */
  | { kind: 'session-approval-removed'; names: readonly string[] }
  /** Values for each session of the workspace, from an answer. */
  | { kind: 'value-given'; names: readonly string[] }
  | { kind: 'value-removed'; names: readonly string[] }

/** A piece of a note: words, or the name of a secret, in code style. */
export type NotePiece = string | { name: string }

/** The order of the secret changes in a note. */
const changeOrder: readonly CapabilityChange['kind'][] = [
  'pre-approved',
  'pre-approval-removed',
  'session-approval-removed',
  'value-given',
  'value-removed',
]

/** Items as one list, as English writes it: "A", "A and B", "A, B, and C". */
function inList(items: readonly (readonly NotePiece[])[]): NotePiece[] {
  return items.flatMap((item, index) => {
    if (index === 0) return [...item]
    if (index < items.length - 1) return [', ', ...item]
    return [items.length > 2 ? ', and ' : ' and ', ...item]
  })
}

/** The names of a change, each in code style, as one list. */
function names(list: readonly string[]): NotePiece[] {
  return inList(list.map((name) => [{ name }]))
}

/** "the pre-approval of" for one name, and "the pre-approvals of" for more. */
function theOf(what: string, list: readonly string[]): string {
  return `the ${what}${list.length === 1 ? '' : 's'} of `
}

/** What one change says, after the member who made it. */
function clause(change: CapabilityChange): NotePiece[] {
  switch (change.kind) {
    case 'pre-approved':
      return ['pre-approved ', ...names(change.names)]
    case 'pre-approval-removed':
      return [
        `removed ${theOf('pre-approval', change.names)}`,
        ...names(change.names),
      ]
    case 'session-approval-removed':
      return [
        `removed ${theOf('approval', change.names)}`,
        ...names(change.names),
        ' for this session',
      ]
    case 'value-given':
      return ['gave ', ...names(change.names), ' for this workspace']
    case 'value-removed':
      return [
        `removed ${theOf('value', change.names)}`,
        ...names(change.names),
        ' for this workspace',
      ]
  }
}

/**
 * The note of one write, which is also the text that the agent gets: the
 * member, then each secret change in one sentence. `who` starts the
 * sentence: "You" for the viewer who made the change, and the name of the
 * member for the others and for the agent. A write that changed no fact
 * of a session gives that session no note.
 */
export function capabilityChangeWords(
  who: string,
  changes: readonly CapabilityChange[],
): NotePiece[] {
  const sorted = changeOrder.flatMap((kind) =>
    changes.filter((change) => change.kind === kind),
  )
  return [`${who} `, ...inList(sorted.map(clause)), '.']
}
