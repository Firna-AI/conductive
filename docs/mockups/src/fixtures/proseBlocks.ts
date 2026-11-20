import type { AgentBlock } from './conversations'

/** A quote in a message of the agent, with the blocks that it holds. */
export type MessageQuote = { kind: 'quote'; blocks: readonly AgentBlock[] }

/** A rule in a message of the agent: a line between two of its parts. */
export type MessageRule = { kind: 'rule' }

/** A quote of the blocks, such as `> text` in Markdown. */
export function quote(...blocks: AgentBlock[]): MessageQuote {
  return { kind: 'quote', blocks }
}

/** A rule, such as `---` in Markdown. */
export const rule: MessageRule = { kind: 'rule' }

/**
 * The address of the phone test of Priya, on two lines, as an agent writes
 * an address with a line-break tag.
 */
export const twoLineAddress = '221B Baker Street<br>London NW1 6XE'
