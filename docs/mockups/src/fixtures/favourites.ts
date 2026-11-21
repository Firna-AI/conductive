import type { AgentChoice } from './agents'

/** The most favourites that a member keeps. */
export const favouriteLimit = 5

/**
 * The favourites of Cal, in the order of the model menu. Each is a full
 * choice: a model, an effort, and fast mode. A favourite has no name of
 * its own, so the menu shows what it runs.
 */
export const favourites: readonly AgentChoice[] = [
  { agent: 'claude', model: 'Opus 5.5', effort: 'high' },
  { agent: 'claude', model: 'Opus 5.5', effort: 'max', fast: true },
  { agent: 'claude', model: 'Sonnet 5.5', effort: 'medium' },
  { agent: 'codex', model: 'GPT-6.1 Sol', effort: 'high' },
  { agent: 'claude', model: 'Fable 5.1', effort: 'low' },
]

/** Two choices are the same: the same model, effort, and fast mode. */
export function sameChoice(a: AgentChoice, b: AgentChoice): boolean {
  return (
    a.agent === b.agent &&
    a.model === b.model &&
    a.effort === b.effort &&
    (a.fast === true) === (b.fast === true)
  )
}
