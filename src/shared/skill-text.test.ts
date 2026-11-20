import { describe, expect, test } from 'vitest'
import { skillNames, skillTextAt } from './skill-text'

const skills = new Set(['plans', 'review', 'tmp'])
const known = (name: string) => skills.has(name)

describe('the skill texts of a message', () => {
  test('a skill text stands at the start, after a space, or after a line break, and ends at white space', () => {
    expect(skillNames('/plans first, then /review\tnow\n/tmp', known)).toEqual([
      'plans',
      'review',
      'tmp',
    ])
  })

  test('a slash inside a word or a path, or a name with more after it, names no skill', () => {
    expect(skillNames('src/plans a//review /plans. /tmp/x', known)).toEqual([])
  })

  test('inline code and a fenced code block stay code, and the text after them counts', () => {
    expect(
      skillNames('Run `/plans` here\n```sh\n/review\n```\n/tmp', known),
    ).toEqual(['tmp'])
  })

  test('an unclosed backtick makes the rest of the text code', () => {
    expect(skillNames('/review then ` /plans', known)).toEqual(['review'])
  })

  test('an unknown name names nothing, and a backtick in it still starts code', () => {
    expect(skillNames('/unknown /x`y /plans` /tmp', known)).toEqual(['tmp'])
  })

  test('a repeated name comes once, in the order of its first text', () => {
    expect(skillNames('/review /plans /review /plans', known)).toEqual([
      'review',
      'plans',
    ])
  })

  test('skillTextAt gives the source and the name of a skill text', () => {
    expect(skillTextAt('Use /plans now', 4)).toEqual({
      kind: 'skill',
      source: '/plans',
      name: 'plans',
    })
    expect(skillTextAt('Use / now', 4)).toBeNull()
  })
})
