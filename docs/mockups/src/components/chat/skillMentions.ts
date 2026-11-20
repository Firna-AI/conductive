import { skills, type Skill } from '../../fixtures/skills'

/** A skill in a text: `/` and the name of a skill of the list. */
export type SkillPart = {
  kind: 'skill'
  skill: Skill
  /** The skill as the text has it, such as `/plans`. */
  source: string
}

/**
 * `/` at the start of the text or after a space or a line break, then a
 * name up to the next space. So `src/a` and a link hold no skill text.
 */
const skillPattern = /(?<=^|\s)\/(\S+)/g

/**
 * Splits a text into plain text and its skills. Only a name of the list
 * of skills is a skill. Every other such text, such as `/tmp`, stays text.
 */
export function skillParts(
  text: string,
): ({ kind: 'text'; text: string } | SkillPart)[] {
  const parts: ({ kind: 'text'; text: string } | SkillPart)[] = []
  let end = 0
  for (const match of text.matchAll(skillPattern)) {
    const skill = skills.find((item) => item.name === match[1])
    if (!skill) continue
    if (match.index > end) {
      parts.push({ kind: 'text', text: text.slice(end, match.index) })
    }
    parts.push({ kind: 'skill', skill, source: match[0] })
    end = match.index + match[0].length
  }
  if (end < text.length) parts.push({ kind: 'text', text: text.slice(end) })
  return parts
}

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
