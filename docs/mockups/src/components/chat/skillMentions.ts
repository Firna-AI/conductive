import { skills, type Skill } from '../../fixtures/skills'

/** The most rows that the list shows. A longer query narrows it. */
const skillRowLimit = 100

/**
 * How well a skill matches the query: 0 when its name starts with the
 * query, 1 when its name holds it, 2 when its description holds it, and
 * null when it does not match. Case does not count.
 */
function rankOf(skill: Skill, query: string): number | null {
  const name = skill.name.toLowerCase()
  if (name.startsWith(query)) return 0
  if (name.includes(query)) return 1
  if (skill.description.toLowerCase().includes(query)) return 2
  return null
}

/**
 * The rows of the list for a query. The best matches come first, and each
 * rank is in name order. Without a query, every skill matches in the same
 * rank.
 */
export function skillRows(query: string): Skill[] {
  const wanted = query.toLowerCase()
  return skills
    .flatMap((skill) => {
      const rank = rankOf(skill, wanted)
      return rank === null ? [] : [{ skill, rank }]
    })
    .sort((a, b) => a.rank - b.rank || a.skill.name.localeCompare(b.skill.name))
    .slice(0, skillRowLimit)
    .map((row) => row.skill)
}
