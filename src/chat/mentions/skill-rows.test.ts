import { describe, expect, test } from 'vitest'
import { skillRows } from './skill-rows'
import { skill } from './skills-test-kit'

const names = (rows: readonly { name: string }[]) => rows.map((row) => row.name)

describe('the rows of the list of /', () => {
  test('names that start with the query come first, then names that hold it, then descriptions that hold it, each in name order and without regard to case', () => {
    const skills = [
      skill('Review-docs', 'Read the docs.'),
      skill('code-review', 'Look at the diff.'),
      skill('commit', 'Write a review note in the commit.'),
      skill('review', 'Review the branch.'),
      skill('plans', 'Write a plan.'),
    ]
    expect(names(skillRows(skills, 'REV'))).toEqual([
      'review',
      'Review-docs',
      'code-review',
      'commit',
    ])
  })

  test('without a query, every skill shows in name order', () => {
    const skills = [skill('testing'), skill('Docs'), skill('brainstorming')]
    expect(names(skillRows(skills, ''))).toEqual([
      'brainstorming',
      'Docs',
      'testing',
    ])
  })

  test('at most 100 rows show', () => {
    const skills = Array.from({ length: 120 }, (_, index) =>
      skill(`skill-${String(index).padStart(3, '0')}`),
    )
    const rows = skillRows(skills, 'skill')
    expect({ count: rows.length, last: rows.at(-1)?.name }).toEqual({
      count: 100,
      last: 'skill-099',
    })
  })
})
