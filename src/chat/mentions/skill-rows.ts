import type { AgentSkill } from '../../shared/skills'

/** The most rows that the list of `/` shows. A longer query narrows it. */
const SKILL_ROW_LIMIT = 100

/** A skill with the lower-case name that the order reads, and its rank. */
interface Ranked {
  skill: AgentSkill
  name: string
  rank: number
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function byRank(a: Ranked, b: Ranked): number {
  return (
    a.rank - b.rank ||
    compare(a.name, b.name) ||
    compare(a.skill.name, b.skill.name)
  )
}

/**
 * How well a skill matches a lower-case query: 0 when its name starts with
 * the query, 1 when its name holds it, 2 when its description holds it,
 * and null when it does not match. An empty query matches each skill in
 * rank 0.
 */
function rankOf(name: string, skill: AgentSkill, query: string): number | null {
  if (name.startsWith(query)) return 0
  if (name.includes(query)) return 1
  if (skill.description.toLowerCase().includes(query)) return 2
  return null
}

/**
 * The rows of the list of `/` for a query: the skills of one agent that
 * match, the best first, each rank in the order of the names. Case does
 * not count. At most `SKILL_ROW_LIMIT` rows show.
 */
export function skillRows(
  skills: readonly AgentSkill[],
  query: string,
): AgentSkill[] {
  const wanted = query.toLowerCase()
  const found: Ranked[] = []
  for (const skill of skills) {
    const name = skill.name.toLowerCase()
    const rank = rankOf(name, skill, wanted)
    if (rank !== null) found.push({ skill, name, rank })
  }
  return found
    .sort(byRank)
    .slice(0, SKILL_ROW_LIMIT)
    .map((row) => row.skill)
}
