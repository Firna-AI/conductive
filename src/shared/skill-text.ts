/**
 * A skill text: `/` and the name of a skill, such as `/plans`, at the start
 * of the text or after white space. The name runs to the next white space or
 * to the end of the text. See "The stored text" in
 * `docs/protocol/skill-mentions.md`.
 */
export interface SkillText {
  kind: 'skill'
  /** The skill text as the text has it, such as `/plans`. */
  source: string
  /** The name of the skill, without `/`. */
  name: string
}

const NAME = /\S+/y

/** The skill text that starts at `at`, or null. It does not look for code. */
export function skillTextAt(text: string, at: number): SkillText | null {
  if (text[at] !== '/' || (at > 0 && !/\s/.test(text[at - 1]))) return null
  NAME.lastIndex = at + 1
  const name = NAME.exec(text)?.[0]
  return name ? { kind: 'skill', source: `/${name}`, name } : null
}

/**
 * The names of the skill texts outside code that `known` accepts, each name
 * once, in the order of the text. Code reads as in a sent message of the
 * chat: a backtick starts code, which runs to the next backtick, or to the
 * end of the text. So inline code and a code block between fences of three
 * backticks stay code. A skill text that `known` does not accept is plain
 * text, so a backtick in it still starts code.
 */
export function skillNames(
  text: string,
  known: (name: string) => boolean,
): string[] {
  const names = new Set<string>()
  let index = 0
  while (index < text.length) {
    if (text[index] === '`') {
      const end = text.indexOf('`', index + 1)
      index = end === -1 ? text.length : end + 1
      continue
    }
    const skill = skillTextAt(text, index)
    if (skill && known(skill.name)) {
      names.add(skill.name)
      index += skill.source.length
      continue
    }
    index += 1
  }
  return [...names]
}
